import { HttpsError } from "firebase-functions/v2/https";
import { adminDb } from "../config/firebase-admin";

const COLLECTION = "_rateLimits";

/**
 * Firestore-backed sliding-window limiter. Cloud Functions instances are
 * ephemeral and don't share memory across invocations the way a long-lived
 * Express process would, so the counter has to live somewhere durable —
 * a transaction on a small Firestore doc keeps it atomic under concurrent hits.
 */
export async function enforceRateLimit(bucket: string, key: string, max: number, windowMs: number): Promise<void> {
  const ref = adminDb.collection(COLLECTION).doc(`${bucket}_${key}`);
  const now = Date.now();

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as { count: number; resetAt: number }) : null;

    if (!data || now > data.resetAt) {
      tx.set(ref, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (data.count >= max) {
      throw new HttpsError("resource-exhausted", "Too many attempts. Please try again later.");
    }
    tx.update(ref, { count: data.count + 1 });
  });
}
