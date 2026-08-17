import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../config/firebase-admin";

// Keeps chats/{id}.openQuestionsCount, pendingTasksCount and
// pendingDecisionsCount in sync with the tasks/questions/decisions
// subcollections, so chat-list badges and the "while you were away" digest
// read one cheap field instead of scanning a subcollection on every render.
async function bump(parentCollection: "chats" | "groups", parentId: string, field: string, delta: number) {
  await adminDb
    .collection(parentCollection)
    .doc(parentId)
    .update({ [field]: FieldValue.increment(delta) })
    .catch(() => {
      // Parent chat/group was deleted concurrently — nothing to update.
    });
}

// ─── Questions ──────────────────────────────────────────────────────────────
export const onQuestionCreatedChat = onDocumentCreated("chats/{chatId}/questions/{id}", (event) =>
  bump("chats", event.params.chatId, "openQuestionsCount", 1)
);
export const onQuestionCreatedGroup = onDocumentCreated("groups/{groupId}/questions/{id}", (event) =>
  bump("groups", event.params.groupId, "openQuestionsCount", 1)
);
export const onQuestionAnsweredChat = onDocumentUpdated("chats/{chatId}/questions/{id}", (event) => {
  if (event.data?.before.data().status === "open" && event.data?.after.data().status === "answered") {
    return bump("chats", event.params.chatId, "openQuestionsCount", -1);
  }
  return undefined;
});
export const onQuestionAnsweredGroup = onDocumentUpdated("groups/{groupId}/questions/{id}", (event) => {
  if (event.data?.before.data().status === "open" && event.data?.after.data().status === "answered") {
    return bump("groups", event.params.groupId, "openQuestionsCount", -1);
  }
  return undefined;
});

// ─── Tasks ──────────────────────────────────────────────────────────────────
export const onTaskCreatedChat = onDocumentCreated("chats/{chatId}/tasks/{id}", (event) =>
  bump("chats", event.params.chatId, "pendingTasksCount", 1)
);
export const onTaskCreatedGroup = onDocumentCreated("groups/{groupId}/tasks/{id}", (event) =>
  bump("groups", event.params.groupId, "pendingTasksCount", 1)
);
export const onTaskCompletedChat = onDocumentUpdated("chats/{chatId}/tasks/{id}", (event) => {
  if (event.data?.before.data().status === "pending" && event.data?.after.data().status === "done") {
    return bump("chats", event.params.chatId, "pendingTasksCount", -1);
  }
  return undefined;
});
export const onTaskCompletedGroup = onDocumentUpdated("groups/{groupId}/tasks/{id}", (event) => {
  if (event.data?.before.data().status === "pending" && event.data?.after.data().status === "done") {
    return bump("groups", event.params.groupId, "pendingTasksCount", -1);
  }
  return undefined;
});

// ─── Decisions ──────────────────────────────────────────────────────────────
// Decisions have no resolved state — this is a running total, not a "pending"
// queue (surfaced in the UI simply as "Decisions", per the field's own doc).
export const onDecisionCreatedChat = onDocumentCreated("chats/{chatId}/decisions/{id}", (event) =>
  bump("chats", event.params.chatId, "pendingDecisionsCount", 1)
);
export const onDecisionCreatedGroup = onDocumentCreated("groups/{groupId}/decisions/{id}", (event) =>
  bump("groups", event.params.groupId, "pendingDecisionsCount", 1)
);
