import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../config/firebase-admin";
import { sendPushToUser } from "./notify";

// First scheduled function in this repo. Follow-ups are personal reminders
// (see FollowUpDoc in mobile/src/lib/firestore.ts) delivered via the same FCM
// pipeline used for message pushes, rather than a client-side local
// notification, so they still fire if the app was killed or the device
// rebooted since the reminder was set.
export const deliverDueFollowUps = onSchedule("every 5 minutes", async () => {
  const now = Timestamp.now();
  const dueSnap = await adminDb.collection("followUps").where("status", "==", "pending").where("remindAt", "<=", now).get();

  if (dueSnap.empty) return;

  await Promise.all(
    dueSnap.docs.map(async (followUpDoc) => {
      const followUp = followUpDoc.data();
      await sendPushToUser({
        recipientId: followUp.uid,
        title: "Follow-up reminder",
        body: followUp.sourceText,
        chatId: followUp.chatId,
        collectionName: followUp.isGroup ? "groups" : "chats",
      });
      await followUpDoc.ref.update({ status: "sent" });
    })
  );
});
