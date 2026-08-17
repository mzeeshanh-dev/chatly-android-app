import { useEffect, useState } from 'react';
import { onSnapshot, questionsRef, decisionsRef, tasksRef, type QuestionDoc, type TaskDoc } from '../lib/firestore';

/**
 * Live open-question/pending-task/decision counts for one conversation —
 * computed directly from the subcollections client-side. Previously these
 * were denormalized fields on the parent chat/group doc, maintained by a
 * Cloud Functions Firestore trigger; dropped in favor of this (no Cloud
 * Functions backend — see root README's "Server architecture" section).
 */
export function useTrackedItemCounts(parentCollection: 'chats' | 'groups', parentId: string) {
  const [openQuestionsCount, setOpenQuestionsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingDecisionsCount, setPendingDecisionsCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      questionsRef(parentCollection, parentId),
      (snap) => {
        setOpenQuestionsCount(snap.docs.filter((d) => (d.data() as QuestionDoc).status === 'open').length);
      },
      (err) => console.warn("questions count onSnapshot error:", err)
    );
    return unsub;
  }, [parentCollection, parentId]);

  useEffect(() => {
    const unsub = onSnapshot(
      tasksRef(parentCollection, parentId),
      (snap) => {
        setPendingTasksCount(snap.docs.filter((d) => (d.data() as TaskDoc).status === 'pending').length);
      },
      (err) => console.warn("tasks count onSnapshot error:", err)
    );
    return unsub;
  }, [parentCollection, parentId]);

  useEffect(() => {
    const unsub = onSnapshot(
      decisionsRef(parentCollection, parentId),
      (snap) => {
        setPendingDecisionsCount(snap.size);
      },
      (err) => console.warn("decisions count onSnapshot error:", err)
    );
    return unsub;
  }, [parentCollection, parentId]);

  return { openQuestionsCount, pendingTasksCount, pendingDecisionsCount };
}
