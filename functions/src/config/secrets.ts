import { defineSecret } from "firebase-functions/params";

// The only two values from the web app's .env that are genuinely sensitive —
// everything else (cloud name, api key, smtp host/user) lives in .env since
// Cloudinary/SMTP treat those as public identifiers, not credentials.
// Values are injected at invocation time via Secret Manager; call .value()
// inside a handler, never at module load time.
export const SMTP_PASS = defineSecret("SMTP_PASS");
export const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");
