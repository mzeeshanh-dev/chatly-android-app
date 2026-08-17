# Chatly — Android App (React Native)

Bare React Native CLI app (no Expo) for Android, sharing the Chatly web app's Firebase project (`chatly-ec08f`) for Auth/Firestore/Messaging. Privileged server-side operations (chat media upload, push dispatch, transactional email) go through the **Chatly web app's own Next.js API routes** (Vercel), not Firebase Cloud Functions — this project deliberately stays on Firebase's free Spark plan, which can't run Cloud Functions at all. See the root [README's "Server architecture" section](../README.md#server-architecture--why-no-cloud-functions) for the full picture; `../functions` exists only as unused reference code.

## One-time setup: Firebase

`@react-native-firebase` needs a real `google-services.json` for the native Android SDKs to initialize. The real file is never committed — it's regenerated from a base64 env var, the same "creds live in `.env`, not in the repo" pattern the web app uses:

1. Firebase Console → project **chatly-ec08f** → **Add app** → Android.
2. Package name: `com.chatly.mobile` (already set in `android/app/build.gradle` — change both places together if you rename it).
3. Download the generated `google-services.json`.
4. Base64-encode it (`certutil -encode android\app\google-services.json tmp.b64` on Windows, `base64 -w0 android/app/google-services.json` on Linux/macOS) and put the result in `.env` (copy `.env.example` first) as `GOOGLE_SERVICES_JSON_BASE64=...`.
5. Run `npm run setup:firebase` to write the real `android/app/google-services.json` (this also runs automatically before `npm run android`).

## Install & run

```bash
npm install
npm run android     # builds + installs debug build on a running emulator/device
```

### Windows: path length

`@react-native-firebase`'s CMake-generated codegen paths (Firestore/Messaging/Auth JSI bindings) are long enough that building from a deeply nested folder — e.g. `C:\Users\<you>\Desktop\Chatly mobile App\mobile\...` — can exceed Windows' 260-character path limit and fail with `ninja: error: ... Filename longer than 260 characters`. Two fixes, either works:

- **Map a short drive letter** (no admin rights needed, no files moved): `subst X: "C:\Users\<you>\Desktop\Chatly mobile App"`, then build from `X:\mobile` instead. `subst` doesn't persist across reboots — re-run it (or add it to a startup script) each session.
- **Enable Windows long path support** system-wide (`HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1`, requires admin + reboot), or just clone/build from a short path like `C:\dev\chatly` instead.

If you hit this after having already tried to build from the long path, delete `android/app/.cxx` and `android/app/build` before rebuilding from the corrected path — CMake's cache stores absolute paths and won't self-heal otherwise.

For faster local iteration, restrict the native build to your device/emulator's ABI instead of all four:

```bash
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a   # or x86_64 for most emulators
```

Omit the flag for the final distributable build so it installs on any device.

Requires a running Android emulator or a device with USB debugging enabled and `adb devices` showing it connected. `ANDROID_HOME` and a JDK must be set up (standard React Native Android prerequisites).

## Building an installable APK

```bash
cd android
./gradlew assembleDebug     # unsigned debug APK — installs on any device with "unknown sources" allowed
# or
./gradlew assembleRelease   # release build (uses the default debug keystore for now — see note below)
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk` (or `release/app-release.apk`). Copy that file to any Android device and install it directly — no Play Store, no Expo/EAS account needed.

**Before a real release**, generate your own upload keystore and wire it into `android/app/build.gradle`'s `signingConfigs.release` (currently reuses the debug keystore, which is fine for internal testing/sideloading but not for a Play Store submission).

## Architecture notes

- **Data layer** (`src/lib/firebase.ts`, `firestore.ts`, `src/context/AuthContext.tsx`, `src/hooks/useFirestoreQueries.ts`) is a close port of the web app's equivalents — same collections, same document shapes, same realtime-listener-into-query-cache pattern (TanStack Query).
- **Styling**: NativeWind (Tailwind classes) for layout/spacing/typography; exact theme colors (`src/theme/tokens.ts`, matching the web app's `globals.css`) are applied via `useTheme()` + inline `style` for anything that must be pixel-exact across light/dark (message bubbles, ticks, status bars) — a deliberate hybrid rather than fighting NativeWind's dark-mode timing on native.
- **Fonts**: Inter (Regular/Medium/SemiBold/Bold/ExtraBold), bundled as real static TTFs under `android/app/src/main/assets/fonts/` and wired as the default `<Text>`/`<TextInput>` font in `App.tsx`.
- **Animation**: react-native-reanimated (physics springs) + Moti, used in the splash screen, message bubble entrances, and button/FAB press feedback.
- **Push**: `@react-native-firebase/messaging` for the native FCM token + data delivery, `@notifee/react-native` for displaying/handling notifications on Android (channel `messages`, matching the backend's push payload). See `src/lib/notifications.ts`. Sending a push is client-triggered — `notifyMessage()` in `src/lib/api.ts` POSTs to the web app's `/api/notify` right after a message write succeeds (no Firestore-trigger function watching for new messages).
- **Media messages**: `src/lib/media.ts` picks (image/file) or records (voice, `react-native-audio-recorder-player`) an attachment and uploads it via `uploadChatMedia()` in `src/lib/api.ts`, which streams the file (multipart `{uri, name, type}`, no base64) to the web app's `/api/upload/chat-media` route — 10MB cap checked both here and server-side. `MessageBubble.tsx` renders the result by `mediaType`.
- **Question/Decision/Task/Follow-up**: `src/lib/tags.ts` holds the Firestore writes; `MessageTagSheet.tsx` is the capture UI (opened from `MessageActionBar`'s new tag action); `TrackedItemsCard.tsx` (shared by `GroupDetailScreen`/`ContactDetailScreen`) lists them per conversation. Open-question/pending-task/decision counts are computed live client-side (`src/hooks/useTrackedItemCounts.ts`), not by a server. Follow-up reminders are delivered as a real local device notification, scheduled via Notifee's trigger-notification API at creation time (`scheduleFollowUpReminder` in `src/lib/notifications.ts`) — no server involved, so it only fires on the device that set it.
- **Presence dots**: `getPresenceDotColor()` in `src/components/Avatar.tsx` — green (connected + online), red (blocked either direction + online), yellow (request pending), otherwise none. Wired into `ChatRow.tsx`, `ChatWindowScreen.tsx`'s header, and `ContactDetailScreen.tsx`'s hero avatar.
- **Crash reporting**: `@react-native-firebase/crashlytics`, wired into `ErrorBoundary.tsx` (`componentDidCatch`) and a global `ErrorUtils.setGlobalHandler` in `App.tsx` for errors outside the render tree. Native crashes are captured automatically once the SDK/Gradle plugin are present — no app code needed for those.

## What's deliberately deferred

Message editing (web's 3-minute edit window), delete-for-everyone, forwarding, multi-select, group member add/remove, group name/photo editing, and the admin portal exist as fields in the shared Firestore schema (`forwarded`, `edited`) or as web-only screens, but don't have mobile UI yet — additive follow-ups, not a rework. Block/unblock and Clear Chat are implemented on mobile (`ContactDetailScreen.tsx`, `GroupDetailScreen.tsx`).

## Troubleshooting

If you're having issues with the base React Native tooling itself (Metro, emulator setup, environment), see the official [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page — this project didn't change any of that.
