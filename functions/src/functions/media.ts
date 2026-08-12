import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { deleteAvatars, uploadAvatar as uploadAvatarToCloudinary } from "../config/cloudinary";
import { CLOUDINARY_API_SECRET } from "../config/secrets";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — same cap the old multer middleware enforced

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
