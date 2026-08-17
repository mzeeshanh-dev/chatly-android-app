# Chatly Cloud Functions

> **Not currently deployed, and not required to run Chatly.** This project intentionally stays on Firebase's free Spark plan, which cannot run Cloud Functions at all (that requires the paid Blaze plan). Every privileged operation mobile needs (media upload, push notifications, transactional email) instead goes through the **Chatly web app's own Next.js API routes** on Vercel — see the root [README's "Server architecture" section](../README.md#server-architecture--why-no-cloud-functions) for the full picture. Everything below describes code that exists in this repo as reference/legacy — accurate to what it does, not to what's actually running in production.

Firebase Cloud Functions for Chatly. Would deploy inside the `chatly-ec08f` project itself if ever used. Chat data (`users`/`chats`/`groups`/`messages`) is never touched here — the mobile app reads/writes those directly via the Firebase client SDK, same as the web app. These functions exist only for operations that need a secret the client must never hold.

## What mobile actually uses instead (no Cloud Functions involved)

| Need | Mobile calls | Not this |
|---|---|---|
| Chat media upload | `POST https://chatly-stream.vercel.app/api/upload/chat-media` (web app's own route) | ~~`uploadChatMedia` below~~ |
| Message push notification | `POST .../api/notify` right after the Firestore write | ~~`onNewChatMessage`/`onNewGroupMessage` triggers below~~ |
| Rejection / request email | `POST .../api/notify/rejection`, `.../api/notify/request` | ~~`sendRejectionEmail`/`sendRequestEmail` below~~ |
| Tag counters (open questions, pending tasks, decisions) | Computed live client-side (`useTrackedItemCounts`) | ~~`tags.ts` triggers below~~ |
| Follow-up delivery | Local Notifee trigger notification, scheduled on-device | ~~`deliverDueFollowUps` below~~ |

## What's in this repo (would be called via `httpsCallable(...)` if deployed)

## Firestore-triggered (no client call — fire on writes)

| Function | File | Fires on |
|---|---|---|
| `onNewChatMessage` / `onNewGroupMessage` | `src/functions/notify.ts` | A new message document — sends the FCM push. **Note:** these existed in code but were missing from `src/index.ts`'s exports, so they were never actually deployed; fixed as part of the media-messages work below. |
| `onQuestionCreatedChat` / `onQuestionCreatedGroup` | `src/functions/tags.ts` | A message marked as a Question — increments `openQuestionsCount` on the parent chat/group |
| `onQuestionAnsweredChat` / `onQuestionAnsweredGroup` | `src/functions/tags.ts` | A question's status flips `open` → `answered` — decrements the counter |
| `onTaskCreatedChat` / `onTaskCreatedGroup` | `src/functions/tags.ts` | A message turned into a Task — increments `pendingTasksCount` |
| `onTaskCompletedChat` / `onTaskCompletedGroup` | `src/functions/tags.ts` | A task's status flips `pending` → `done` — decrements the counter |
| `onDecisionCreatedChat` / `onDecisionCreatedGroup` | `src/functions/tags.ts` | A message recorded as a Decision — increments `pendingDecisionsCount` |

These denormalized counters would let the chat-list badges and digest banner read one cheap field instead of scanning a subcollection — a nice-to-have if this were ever deployed. As-is, both apps compute the same counts client-side from live listeners instead (`useTrackedItemCounts`).

## Scheduled

| Function | File | Schedule |
|---|---|---|
| `deliverDueFollowUps` | `src/functions/followups.ts` | Every 5 minutes — finds `followUps` where `remindAt` has passed and `status == 'pending'`, sends the reminder push, marks it `sent` |

## What exists but isn't currently called by mobile

`src/functions/auth.ts` also exports `register`, `resendOtp`, `verifyOtp`, `forgotOtp`, and `resetPassword` — direct ports of the web app's OTP-code auth flow. Mobile doesn't call any of them: it signs up/logs in via `@react-native-firebase/auth`'s client SDK directly and uses Firebase's built-in email-verification-link flow instead of a typed-in OTP code (see `mobile/src/lib/api.ts`). These functions are effectively dead code from mobile's perspective right now — kept in case mobile ever needs to match the web app's OTP UX exactly, but safe to ignore or remove if that's not planned.

Separately, `uploadAvatar`/`deleteAvatar` above are dead code from a different angle: the mobile Settings screen currently uploads avatars via a legacy Vercel REST endpoint (`https://chatly-stream.vercel.app/api/upload`) instead of calling this function. Not touched as part of this round of work — flagged here so it doesn't look like an oversight.

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

`npm run deploy` (`firebase deploy --only functions`) requires the Blaze plan — see the warning at the top of this file for why that's deliberately not done here. `npm run build`/`npm run serve` (local emulator) still work fine on Spark for exploring this code:

```bash
npm run build          # compiles to lib/, type-checks
npm run serve          # builds + runs the local emulator
npm run shell           # interactive function shell
```

`firestore.rules` (repo root) is unrelated to any of this — it's a normal Firestore feature available on Spark, deployed with:

```bash
firebase deploy --only firestore:rules
```

See the root [README's Firestore security rules section](../README.md#firestore-security-rules) before running that for the first time.
