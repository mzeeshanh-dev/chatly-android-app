import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import {
  deleteAvatars,
  uploadAvatar as uploadAvatarToCloudinary,
  uploadChatMedia as uploadChatMediaToCloudinary,
} from "../config/cloudinary";
import { CLOUDINARY_API_SECRET } from "../config/secrets";
import { adminDb } from "../config/firebase-admin";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — same cap the old multer middleware enforced
const MAX_CHAT_MEDIA_BYTES = 10 * 1024 * 1024; // keep in sync with mobile/src/config/constants.ts MAX_UPLOAD_BYTES

const uploadAvatarSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().startsWith("image/", "Only image uploads are allowed."),
  id: z.string().optional(),
  type: z.enum(["profile", "group"]).default("profile"),
});

// Callable functions take JSON payloads, not file streams, so the client
// base64-encodes the picked image and we decode it back to a Buffer here —
// same Cloudinary upload_stream pipeline the old /media/avatar route used.
export const uploadAvatar = onCall({ secrets: [CLOUDINARY_API_SECRET] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

  const parsed = uploadAvatarSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message ?? "Invalid upload payload.");
  }
  const { base64, type } = parsed.data;
  const id = parsed.data.id || (type === "profile" ? request.auth.uid : undefined);
  if (!id) throw new HttpsError("invalid-argument", "Missing id.");

  // Users may only overwrite their own profile avatar through this call.
  if (type === "profile" && id !== request.auth.uid) {
    throw new HttpsError("permission-denied", "You can only update your own profile picture.");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_BYTES) {
    throw new HttpsError("invalid-argument", "Image must be 5MB or smaller.");
  }

  return uploadAvatarToCloudinary(buffer, id, type);
});

const deleteAvatarSchema = z.object({
  publicId: z.string().optional(),
  publicIds: z.array(z.string()).optional(),
});

export const deleteAvatar = onCall({ secrets: [CLOUDINARY_API_SECRET] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

  const parsed = deleteAvatarSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Invalid input.");

  const ids = parsed.data.publicIds ?? (parsed.data.publicId ? [parsed.data.publicId] : []);
  if (ids.length === 0) throw new HttpsError("invalid-argument", "publicId is required.");

  await deleteAvatars([...new Set(ids.map((id) => id.trim()))]);
  return { success: true };
});

const uploadChatMediaSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1),
  mediaType: z.enum(["image", "file", "voice"]),
  chatId: z.string().min(1),
  isGroup: z.boolean().default(false),
});

// Same base64-in-JSON approach as uploadAvatar above, generalized to any
// resource type and gated by conversation membership (unlike the avatar
// upload, chatId here is client-supplied, so it must be verified server-side).
export const uploadChatMedia = onCall({ secrets: [CLOUDINARY_API_SECRET] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

  const parsed = uploadChatMediaSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message ?? "Invalid upload payload.");
  }
  const { base64, mediaType, chatId, isGroup } = parsed.data;

  const parentCollection = isGroup ? "groups" : "chats";
  const parentDoc = await adminDb.collection(parentCollection).doc(chatId).get();
  if (!parentDoc.exists) throw new HttpsError("not-found", "Conversation not found.");

  const membership = isGroup
    ? ((parentDoc.data()?.memberIds ?? []) as string[])
    : ((parentDoc.data()?.participants ?? []) as string[]);
  if (!membership.includes(request.auth.uid)) {
    throw new HttpsError("permission-denied", "You are not a participant in this conversation.");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_CHAT_MEDIA_BYTES) {
    throw new HttpsError("invalid-argument", "File must be 10MB or smaller.");
  }

  const result = await uploadChatMediaToCloudinary(buffer, chatId, mediaType);
  return { url: result.url, publicId: result.publicId, sizeBytes: buffer.byteLength };
});
