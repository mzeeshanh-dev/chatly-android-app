/**
 * Turns a message into a Question, Decision, Task, or personal Follow-up.
 * Each write lands in a subcollection mirroring `messagesRef` (see
 * questionsRef/decisionsRef/tasksRef/followUpsRef in ./firestore). Open
 * question/pending task/decision counts are computed client-side (see
 * hooks/useTrackedItemCounts.ts) rather than via a server-maintained counter
 * field — this app has no Cloud Functions backend.
 */
import { addDoc, updateDoc, doc, FieldValue, questionsRef, decisionsRef, tasksRef, followUpsRef } from './firestore';
import { scheduleFollowUpReminder } from './notifications';

type ParentCollection = 'chats' | 'groups';

export async function markAsQuestion(parent: ParentCollection, parentId: string, sourceMessageId: string, sourceText: string, askedBy: string) {
  await addDoc(questionsRef(parent, parentId), {
    sourceMessageId,
    sourceText,
    askedBy,
    status: 'open',
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function answerQuestion(parent: ParentCollection, parentId: string, questionId: string, answerText: string, answeredBy: string) {
  await updateDoc(doc(questionsRef(parent, parentId), questionId), {
    status: 'answered',
    answerText,
    answeredBy,
    answeredAt: FieldValue.serverTimestamp(),
  });
}

export async function markAsDecision(parent: ParentCollection, parentId: string, sourceMessageId: string, sourceText: string, summary: string, createdBy: string) {
  await addDoc(decisionsRef(parent, parentId), {
    sourceMessageId,
    sourceText,
    summary,
    decidedBy: [createdBy],
    createdBy,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function createTask(
  parent: ParentCollection,
  parentId: string,
  sourceMessageId: string,
  sourceText: string,
  title: string,
  assignedTo: string,
  dueAt: Date | null,
  createdBy: string
) {
  await addDoc(tasksRef(parent, parentId), {
    sourceMessageId,
    sourceText,
    title,
    assignedTo,
    dueAt: dueAt ?? null,
    createdBy,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function completeTask(parent: ParentCollection, parentId: string, taskId: string) {
  await updateDoc(doc(tasksRef(parent, parentId), taskId), {
    status: 'done',
    completedAt: FieldValue.serverTimestamp(),
  });
}

export async function createFollowUp(uid: string, chatId: string, isGroup: boolean, messageId: string, sourceText: string, remindAt: Date) {
  const docRef = await addDoc(followUpsRef(), {
    uid,
    chatId,
    isGroup,
    messageId,
    sourceText,
    remindAt,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
  // Delivery is a local on-device notification (no server to deliver this
  // remotely) — see scheduleFollowUpReminder's doc comment for the trade-off.
  await scheduleFollowUpReminder(docRef.id, remindAt, sourceText);
}
