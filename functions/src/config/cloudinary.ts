import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { CLOUDINARY_API_SECRET } from "./secrets";

const APP_FOLDER = "Chatly";

export interface UploadResult {
  url: string;
  publicId: string;
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET.value(),
    secure: true,
  });
  configured = true;
}

export function getAvatarPublicId(id: string, type: "profile" | "group" = "profile"): string {
  return `${APP_FOLDER}/${type}s/${id}`;
}

export async function uploadAvatar(
  fileBuffer: Buffer,
  id: string,
  type: "profile" | "group" = "profile"
): Promise<UploadResult> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${APP_FOLDER}/${type}s`,
        public_id: id,
        overwrite: true,
        unique_filename: false,
        invalidate: true,
        transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

export async function deleteAvatars(publicIds: string[]): Promise<void> {
  ensureConfigured();
  await Promise.all(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image" }))
  );
}
