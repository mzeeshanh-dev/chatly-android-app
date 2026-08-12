import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb, COLLECTIONS } from "../config/firebase-admin";
import { generateOTP, sendOTPEmail, sendPasswordResetEmail } from "../services/otp";
import { enforceRateLimit } from "../services/rateLimit";
import { SMTP_PASS } from "../config/secrets";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes — matches the web app

// Abuse-prone calls (account creation, email sends) get a tight cap; the
// code-entry calls get a looser one so a mistyped digit doesn't lock a user out.
const STRICT_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };
const RELAXED_LIMIT = { max: 15, windowMs: 15 * 60 * 1000 };

function otpDoc(id: string) {
  return adminDb.collection(COLLECTIONS.OTPS).doc(id);
}

function badInput(message: string): never {
  throw new HttpsError("invalid-argument", message);
}

const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

// Creates the Firebase Auth user server-side (via Admin SDK) instead of
// letting the client create it directly — the account never exists
// half-configured on a device the way client-side createUserWithEmailAndPassword
// would allow.
export const register = onCall({ secrets: [SMTP_PASS] }, async (request) => {
  const parsed = registerSchema.safeParse(request.data);
  if (!parsed.success) badInput(parsed.error.issues[0]?.message ?? "Invalid input.");
  const { email, displayName, password } = parsed.data;

  await enforceRateLimit("register", email, STRICT_LIMIT.max, STRICT_LIMIT.windowMs);

  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existing) {
    const profileSnap = await adminDb.collection(COLLECTIONS.USERS).doc(existing.uid).get();
    if (profileSnap.exists) {
      throw new HttpsError("already-exists", "An account with this email already exists.");
    }
    // Ghost account from an abandoned registration — clear it and start fresh.
    await adminAuth.deleteUser(existing.uid).catch(() => undefined);
    await otpDoc(email).delete().catch(() => undefined);
  }

  const user = await adminAuth.createUser({ email, password, displayName });

  const code = generateOTP();
  await otpDoc(email).set({
    code,
    uid: user.uid,
    displayName,
    expiresAt: Timestamp.fromMillis(Date.now() + OTP_TTL_MS),
  });

  await sendOTPEmail(email, code);

  return { success: true, uid: user.uid };
});

const emailSchema = z.object({ email: z.string().email() });

export const resendOtp = onCall({ secrets: [SMTP_PASS] }, async (request) => {
  const parsed = emailSchema.safeParse(request.data);
  if (!parsed.success) badInput("A valid email is required.");
  const { email } = parsed.data;

  await enforceRateLimit("resendOtp", email, STRICT_LIMIT.max, STRICT_LIMIT.windowMs);

  const snap = await otpDoc(email).get();
  if (!snap.exists) throw new HttpsError("not-found", "No pending verification found for this email.");
  const data = snap.data()!;

  const code = generateOTP();
  await otpDoc(email).update({ code, expiresAt: Timestamp.fromMillis(Date.now() + OTP_TTL_MS) });
  await sendOTPEmail(email, code);

  return { success: true, displayName: data.displayName };
});

const verifyOtpSchema = z.object({ email: z.string().email(), code: z.string().length(6) });

export const verifyOtp = onCall(async (request) => {
  const parsed = verifyOtpSchema.safeParse(request.data);
  if (!parsed.success) badInput("Email and a 6-digit code are required.");
  const { email, code } = parsed.data;

  await enforceRateLimit("verifyOtp", email, RELAXED_LIMIT.max, RELAXED_LIMIT.windowMs);

  const ref = otpDoc(email);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "No pending verification found for this email.");
  const data = snap.data()!;
  const expiresAt = data.expiresAt as Timestamp;

  if (Timestamp.now().toMillis() > expiresAt.toMillis()) {
    await ref.delete();
    throw new HttpsError("deadline-exceeded", "Verification code has expired. Please register again.");
  }
  if (data.code !== code) {
    throw new HttpsError("permission-denied", "Incorrect verification code.");
  }

  await adminDb
    .collection(COLLECTIONS.USERS)
    .doc(data.uid)
    .set({
      uid: data.uid,
      displayName: data.displayName,
      email,
      photoURL: null,
      bio: "",
      phone: "",
      location: "",
      isActivated: true,
      status: "offline",
      createdAt: Timestamp.now(),
      settings: { theme: "dark", notificationsEnabled: true },
      blockedUsers: [],
      acceptedContacts: [],
      fcmTokens: [],
    });

  await ref.delete();

  return { success: true };
});

export const forgotOtp = onCall({ secrets: [SMTP_PASS] }, async (request) => {
  const parsed = emailSchema.safeParse(request.data);
  if (!parsed.success) badInput("A valid email is required.");
  const { email } = parsed.data;

  await enforceRateLimit("forgotOtp", email, STRICT_LIMIT.max, STRICT_LIMIT.windowMs);

  const user = await adminAuth.getUserByEmail(email).catch(() => null);
  if (!user) {
    // Don't reveal whether the email exists — respond the same either way.
    return { success: true };
  }

  const code = generateOTP();
  await otpDoc(`reset_${email}`).set({
    code,
    email,
    type: "password_reset",
    expiresAt: Timestamp.fromMillis(Date.now() + OTP_TTL_MS),
  });

  await sendPasswordResetEmail(email, code);
  return { success: true };
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
});

// Completes the reset flow: verifies the emailed code, then uses the Admin
// SDK to set the new password directly (only a trusted server can do this —
// the client never holds the old credential to reauthenticate with).
export const resetPassword = onCall(async (request) => {
  const parsed = resetPasswordSchema.safeParse(request.data);
  if (!parsed.success) badInput(parsed.error.issues[0]?.message ?? "Invalid input.");
  const { email, code, newPassword } = parsed.data;

  await enforceRateLimit("resetPassword", email, RELAXED_LIMIT.max, RELAXED_LIMIT.windowMs);

  const ref = otpDoc(`reset_${email}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "No pending password reset found for this email.");
  const data = snap.data()!;
  const expiresAt = data.expiresAt as Timestamp;

  if (Timestamp.now().toMillis() > expiresAt.toMillis()) {
    await ref.delete();
    throw new HttpsError("deadline-exceeded", "Reset code has expired. Please try again.");
  }
  if (data.code !== code) {
    throw new HttpsError("permission-denied", "Incorrect reset code.");
  }

  const user = await adminAuth.getUserByEmail(email).catch(() => null);
  if (!user) throw new HttpsError("not-found", "Account not found.");

  await adminAuth.updateUser(user.uid, { password: newPassword });
  await ref.delete();

  return { success: true };
});
