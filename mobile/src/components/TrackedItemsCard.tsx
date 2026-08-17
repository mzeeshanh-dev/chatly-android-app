import React, { useEffect, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Question, Flag, CheckSquare, Square } from 'phosphor-react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import {
  onSnapshot,
  query,
  orderBy,
  questionsRef,
  decisionsRef,
  tasksRef,
  type QuestionDoc,
  type DecisionDoc,
  type TaskDoc,
} from '../lib/firestore';
import { answerQuestion, completeTask } from '../lib/tags';
import type { Timestamp } from '@react-native-firebase/firestore';

type Tab = 'questions' | 'decisions' | 'tasks';

interface TrackedItemsCardProps {
  parentCollection: 'chats' | 'groups';
  parentId: string;
  myUid: string;
  resolveName: (uid: string) => string;
}

function formatDate(value: Timestamp | undefined): string {
  if (!value?.toDate) return '';
  return value.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Shared by GroupDetailScreen and ContactDetailScreen — every message tagged
 * as a Question/Decision/Task in this conversation, one place to review and
 * act on them instead of scrolling back through the chat.
 */
export function TrackedItemsCard({ parentCollection, parentId, myUid, resolveName }: TrackedItemsCardProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('questions');
  const [questions, setQuestions] = useState<Array<QuestionDoc & { id: string }>>([]);
  const [decisions, setDecisions] = useState<Array<DecisionDoc & { id: string }>>([]);
  const [tasks, setTasks] = useState<Array<TaskDoc & { id: string }>>([]);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(questionsRef(parentCollection, parentId), orderBy('createdAt', 'desc')),
      (snap) => setQuestions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuestionDoc) }))),
      (err) => console.warn('Questions onSnapshot error in card:', err)
    );
    return unsub;
  }, [parentCollection, parentId]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(decisionsRef(parentCollection, parentId), orderBy('createdAt', 'desc')),
      (snap) => setDecisions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as DecisionDoc) }))),
      (err) => console.warn('Decisions onSnapshot error in card:', err)
    );
    return unsub;
  }, [parentCollection, parentId]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(tasksRef(parentCollection, parentId), orderBy('createdAt', 'desc')),
      (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as TaskDoc) }))),
      (err) => console.warn('Tasks onSnapshot error in card:', err)
    );
    return unsub;
  }, [parentCollection, parentId]);

  if (questions.length === 0 && decisions.length === 0 && tasks.length === 0) return null;

  const submitAnswer = async (questionId: string) => {
    if (!answerText.trim()) return;
    await answerQuestion(parentCollection, parentId, questionId, answerText.trim(), myUid);
    setAnsweringId(null);
    setAnswerText('');
  };

  const tabButton = (key: Tab, label: string, count: number) => (
    <Pressable
      onPress={() => setTab(key)}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: tab === key ? colors.primary : 'transparent',
      }}
    >
      <AppText weight="semibold" style={{ fontSize: 12.5, color: tab === key ? '#fff' : colors.mutedForeground }}>
        {label} {count > 0 ? `(${count})` : ''}
      </AppText>
    </Pressable>
  );

  const scrollToMessage = (messageId: string) => {
    navigation.navigate('ChatWindow', { parentCollection, parentId, highlightMessageId: messageId });
  };

  return (
    <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 14, marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', gap: 6, backgroundColor: colors.muted, borderRadius: 12, padding: 4, marginBottom: 12 }}>
        {tabButton('questions', 'Questions', questions.filter((q) => q.status === 'open').length)}
        {tabButton('decisions', 'Decisions', decisions.length)}
        {tabButton('tasks', 'Tasks', tasks.filter((t) => t.status === 'pending').length)}
      </View>

      {tab === 'questions' ? (
        questions.length === 0 ? (
          <AppText muted style={{ fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
            No questions tagged yet.
          </AppText>
        ) : (
          questions.map((q) => (
            <View key={q.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Question size={16} color={q.status === 'open' ? '#f59e0b' : colors.mutedForeground} weight="fill" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => scrollToMessage(q.sourceMessageId)}>
                    <AppText style={{ fontSize: 14 }}>{q.sourceText}</AppText>
                  </Pressable>
                  {q.status === 'answered' ? (
                    <AppText muted style={{ fontSize: 12.5, marginTop: 4 }}>
                      ✅ {q.answerText}
                    </AppText>
                  ) : answeringId === q.id ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TextInput
                        value={answerText}
                        onChangeText={setAnswerText}
                        placeholder="Type an answer…"
                        placeholderTextColor={colors.mutedForeground}
                        style={{ flex: 1, backgroundColor: colors.input, borderRadius: 10, paddingHorizontal: 10, height: 36, color: colors.foreground, fontSize: 13 }}
                      />
                      <Pressable onPress={() => submitAnswer(q.id)} style={{ paddingHorizontal: 12, justifyContent: 'center' }}>
                        <AppText weight="bold" style={{ color: colors.primary, fontSize: 13 }}>
                          Send
                        </AppText>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => { setAnsweringId(q.id); setAnswerText(''); }}>
                      <AppText style={{ color: colors.primary, fontSize: 12.5, marginTop: 4 }}>Answer</AppText>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ))
        )
      ) : tab === 'decisions' ? (
        decisions.length === 0 ? (
          <AppText muted style={{ fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
            No decisions recorded yet.
          </AppText>
        ) : (
          decisions.map((d) => (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Flag size={16} color={colors.primary} weight="fill" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Pressable onPress={() => scrollToMessage(d.sourceMessageId)}>
                  <AppText style={{ fontSize: 14 }}>{d.summary}</AppText>
                  <AppText muted style={{ fontSize: 11.5, marginTop: 4 }}>
                    {resolveName(d.createdBy)} · {formatDate(d.createdAt as Timestamp)}
                  </AppText>
                </Pressable>
              </View>
            </View>
          ))
        )
      ) : tasks.length === 0 ? (
        <AppText muted style={{ fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
          No tasks created yet.
        </AppText>
      ) : (
        tasks.map((t) => (
          <View
            key={t.id}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}
          >
            <Pressable onPress={() => t.status === 'pending' && completeTask(parentCollection, parentId, t.id)}>
              {t.status === 'done' ? (
                <CheckSquare size={18} color={colors.primary} weight="fill" />
              ) : (
                <Square size={18} color={colors.mutedForeground} />
              )}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Pressable onPress={() => scrollToMessage(t.sourceMessageId)}>
                <AppText style={{ fontSize: 14, textDecorationLine: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</AppText>
                <AppText muted style={{ fontSize: 11.5, marginTop: 4 }}>
                  {resolveName(t.assignedTo)}
                  {t.dueAt ? ` · Due ${formatDate(t.dueAt as Timestamp)}` : ''}
                </AppText>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
