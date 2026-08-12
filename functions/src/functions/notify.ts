import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { z } from "zod";
import { adminDb, adminMessaging, COLLECTIONS } from "../config/firebase-admin";
import { sendRejectionEmail as sendRejectionEmailMail, sendRequestEmail as sendRequestEmailMail } from "../services/otp";
import { SMTP_PASS } from "../config/secrets";

const APP_NAME = process.env.APP_NAME ?? "Chatly";
const APP_URL = process.env.APP_URL ?? "https://chatly-stream.vercel.app/chat";

interface PushArgs {
  recipientId: string;
  title?: string;
  body: string;
  senderName?: string;
  senderPhotoUrl?: string;
  chatId?: string;
  collectionName?: "chats" | "groups";
  data?: Record<string, string>;
}

/**
 * Core FCM send, shared by the client-callable sendPush (settings/profile
 * pushes, sent while the sender is confirmed online) and the Firestore
 * triggers below (message pushes — fire once the message is actually on the
 * server, so they work correctly even if the sender was offline when they
 * hit send and it only synced later via Firestore's offline queue).
 */
async function sendPushToUser({ recipientId, title, body, senderName, senderPhotoUrl, chatId, collectionName, data }: PushArgs) {
  const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(recipientId).get();
  if (!userDoc.exists) return { success: true, message: "User not found" };

  const userData = userDoc.data()!;
  if (userData.settings?.notificationsEnabled === false) {
    return { success: true, message: "User disabled notifications" };
  }

  const tokens: string[] = userData.fcmTokens || [];
  if (tokens.length === 0) {
    return { success: true, message: "No active FCM tokens for user" };
  }

  let finalTitle: string;
  if (collectionName === "groups" && title) {
    // Group pushes pass the group name explicitly — WhatsApp-style, title is
    // the group, sender attribution lives in the body instead.
    finalTitle = `${APP_NAME} • ${title}`;
  } else if (chatId && collectionName && senderName) {
    const parentDoc = await adminDb.collection(collectionName).doc(chatId).get();
    const unreadCount = parentDoc.exists ? parentDoc.data()?.unreadCount?.[recipientId] || 0 : 0;
    finalTitle =
      unreadCount > 1 ? `${APP_NAME} • ${senderName} (${unreadCount} new messages)` : `${APP_NAME} • ${senderName}`;
  } else {
    finalTitle = `${APP_NAME} • ${title || senderName || "New Message"}`;
  }

  const response = await adminMessaging.sendEachForMulticast({
    notification: { title: finalTitle, body },
    android: {
      priority: "high",
      notification: { channelId: "messages", sound: "default" },
    },
    data: {
      ...(data ?? {}),
      chatId: chatId || "",
      collectionName: collectionName || "",
      senderPhotoUrl: senderPhotoUrl || "",
      senderName: senderName || "",
    },
    tokens,
  });

  if (response.failureCount > 0) {
    const failedTokens = tokens.filter((_, idx) => !response.responses[idx]?.success);
    if (failedTokens.length > 0) {
      await adminDb
        .collection(COLLECTIONS.USERS)
        .doc(recipientId)
        .update({ fcmTokens: tokens.filter((t) => !failedTokens.includes(t)) });
    }
  }

  return { success: true, successCount: response.successCount, failureCount: response.failureCount };
}

const pushSchema = z.object({
  recipientId: z.string().min(1),
  title: z.string().optional(),
  body: z.string().min(1),
  senderName: z.string().optional(),
  senderPhotoUrl: z.string().optional(),
  chatId: z.string().optional(),
  collectionName: z.enum(["chats", "groups"]).optional(),
  data: z.record(z.string(), z.string()).optional(),
});

// Direct port of the web app's api/notify/route.ts (sendEachForMulticast +
// dead-token cleanup), swapping the webpush block for Android-appropriate config.
export const sendPush = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

  const parsed = pushSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Missing required fields.");
  return sendPushToUser(parsed.data);
});

// Fires once a new DM message actually lands on the server — correct even
// when the sender wrote it while offline and it only synced later, unlike a
// push triggered from the client at the moment "Send" was tapped.
export const onNewChatMessage = onDocumentCreated("chats/{chatId}/messages/{messageId}", async (event) => {
  const message = event.data?.data();
  if (!message || message.type !== "text") return;

  const { chatId } = event.params;
  const chatDoc = await adminDb.collection(COLLECTIONS.CHATS).doc(chatId).get();
  if (!chatDoc.exists) return;

  const participants = (chatDoc.data()?.participants ?? []) as string[];
  const recipientId = participants.find((p) => p !== message.senderId);
  if (!recipientId) return;

  const senderDoc = await adminDb.collection(COLLECTIONS.USERS).doc(message.senderId).get();
  const sender = senderDoc.data();

  await sendPushToUser({
    recipientId,
    body: message.text,
    senderName: sender?.displayName,
    senderPhotoUrl: sender?.photoURL || undefined,
    chatId,
    collectionName: "chats",
  });
});

// Group fan-out — every member except the sender. Previously not implemented
// at all client-side (group pushes were a known gap); this covers it for
// both online and offline-then-synced sends in one place.
export const onNewGroupMessage = onDocumentCreated("groups/{groupId}/messages/{messageId}", async (event) => {
  const message = event.data?.data();
  if (!message || message.type !== "text") return;

  const { groupId } = event.params;
  const groupDoc = await adminDb.collection(COLLECTIONS.GROUPS).doc(groupId).get();
  if (!groupDoc.exists) return;

  const memberIds = (groupDoc.data()?.memberIds ?? []) as string[];
  const recipients = memberIds.filter((uid) => uid !== message.senderId);
  if (recipients.length === 0) return;

  const senderDoc = await adminDb.collection(COLLECTIONS.USERS).doc(message.senderId).get();
  const sender = senderDoc.data();
  const groupName = groupDoc.data()?.name as string | undefined;

  await Promise.all(
    recipients.map((recipientId) =>
      sendPushToUser({
        recipientId,
        title: groupName ? `${groupName}` : undefined,
        body: sender?.displayName ? `${sender.displayName}: ${message.text}` : message.text,
        senderName: sender?.displayName,
        senderPhotoUrl: sender?.photoURL || undefined,
        chatId: groupId,
        collectionName: "groups",
      })
    )
  );
});

const emailNotifySchema = z.object({ toEmail: z.string().email(), fromName: z.string().min(1) });

export const sendRequestEmail = onCall({ secrets: [SMTP_PASS] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const parsed = emailNotifySchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Missing required fields.");
  await sendRequestEmailMail(parsed.data.toEmail, parsed.data.fromName, APP_URL);
  return { success: true };
});

export const sendRejectionEmail = onCall({ secrets: [SMTP_PASS] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const parsed = emailNotifySchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Missing required fields.");
  await sendRejectionEmailMail(parsed.data.toEmail, parsed.data.fromName, APP_URL);
  return { success: true };
});
