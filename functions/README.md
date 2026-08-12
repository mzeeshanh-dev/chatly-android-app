# Chatly Cloud Functions

Firebase Cloud Functions for Chatly — the mobile app's only server-side code. Deploys inside the `chatly-ec08f` project itself, no separate server to host or scale. Chat data (`users`/`chats`/`groups`/`messages`) is never touched here — the mobile app reads/writes those directly via the Firebase client SDK, same as the web app. These functions exist only for operations that need a secret the client must never hold.

## What's actually called by the mobile app

`mobile/src/lib/api.ts` calls these via `httpsCallable(...)`:

| Function | File | Purpose |
|---|---|---|
| `uploadAvatar` | `src/functions/media.ts` | Uploads a profile/group avatar to Cloudinary |
| `deleteAvatar` | `src/functions/media.ts` | Deletes one or more Cloudinary avatars |
| `sendPush` | `src/functions/notify.ts` | Sends an FCM push, gated on the recipient's `settings.notificationsEnabled` |
| `sendRequestEmail` | `src/functions/notify.ts` | Emails a user that they received a chat request |
| `sendRejectionEmail` | `src/functions/notify.ts` | Emails a user that their chat request was declined |

## What exists but isn't currently called by mobile

`src/functions/auth.ts` also exports `register`, `resendOtp`, `verifyOtp`, `forgotOtp`, and `resetPassword` — direct ports of the web app's OTP-code auth flow. Mobile doesn't call any of them: it signs up/logs in via `@react-native-firebase/auth`'s client SDK directly and uses Firebase's built-in email-verification-link flow instead of a typed-in OTP code (see `mobile/src/lib/api.ts`). These functions are effectively dead code from mobile's perspective right now — kept in case mobile ever needs to match the web app's OTP UX exactly, but safe to ignore or remove if that's not planned.

## Setup

```bash
cd functions
npm install
cp .env.example .env   # fill in SMTP_HOST/PORT/USER, Cloudinary cloud name + API key
```

The two genuinely sensitive values — `SMTP_PASS` and `CLOUDINARY_API_SECRET` — are **not** in `.env`. They're set via Secret Manager so they're never written to disk in plaintext:

```bash
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set CLOUDINARY_API_SECRET
```

## Run / deploy

```bash
npm run build          # compiles to lib/
npm run serve          # builds + runs the local emulator
npm run shell           # interactive function shell
npm run deploy          # firebase deploy --only functions
npm run logs             # tail deployed function logs
```
