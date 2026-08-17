import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Question, Flag, ListChecks, BellRinging, CaretLeft } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { markAsQuestion, markAsDecision, createTask, createFollowUp } from '../lib/tags';
import type { MessageWithId } from '../types/chat';

export interface MessageTagSheetRef {
  open: (message: MessageWithId) => void;
  close: () => void;
}

interface Assignee {
  uid: string;
  name: string;
}

interface MessageTagSheetProps {
  parentCollection: 'chats' | 'groups';
  parentId: string;
  myUid: string;
  assignees: Assignee[];
}

type Mode = 'menu' | 'question' | 'decision' | 'task' | 'followup';

function pickDateTime(minimumDate: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value: minimumDate,
      mode: 'date',
      minimumDate,
      onChange: (dateEvent, date) => {
        if (dateEvent.type !== 'set' || !date) return resolve(null);
        DateTimePickerAndroid.open({
          value: minimumDate,
          mode: 'time',
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== 'set' || !time) return resolve(null);
            const combined = new Date(date);
            combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
            resolve(combined);
          },
        });
      },
    });
  });
}

export const MessageTagSheet = forwardRef<MessageTagSheetRef, MessageTagSheetProps>(
  ({ parentCollection, parentId, myUid, assignees }, ref) => {
    const { colors } = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [mode, setMode] = useState<Mode>('menu');
    const [message, setMessage] = useState<MessageWithId | null>(null);
    const [decisionSummary, setDecisionSummary] = useState('');
    const [taskTitle, setTaskTitle] = useState('');
    const [taskAssignee, setTaskAssignee] = useState<Assignee | null>(null);
    const [taskDueAt, setTaskDueAt] = useState<Date | null>(null);
    const [followUpAt, setFollowUpAt] = useState<Date | null>(null);
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (msg) => {
        setMessage(msg);
        setMode('menu');
        setDecisionSummary(msg.text);
        setTaskTitle(msg.text);
        setTaskAssignee(assignees.find((a) => a.uid !== myUid) ?? assignees[0] ?? null);
        setTaskDueAt(null);
        setFollowUpAt(null);
        bottomSheetRef.current?.expand();
      },
      close: () => bottomSheetRef.current?.close(),
    }));

    const closeAndReset = () => {
      bottomSheetRef.current?.close();
      setMode('menu');
    };

    const handleMarkQuestion = async () => {
      if (!message) return;
      setSaving(true);
      try {
        await markAsQuestion(parentCollection, parentId, message.id, message.text, myUid);
        Toast.show({ type: 'success', text1: 'Marked as Question' });
        closeAndReset();
      } catch {
        Toast.show({ type: 'error', text1: 'Could not mark as Question' });
      } finally {
        setSaving(false);
      }
    };

    const handleSaveDecision = async () => {
      if (!message || !decisionSummary.trim()) return;
      setSaving(true);
      try {
        await markAsDecision(parentCollection, parentId, message.id, message.text, decisionSummary.trim(), myUid);
        Toast.show({ type: 'success', text1: 'Decision recorded' });
        closeAndReset();
      } catch {
        Toast.show({ type: 'error', text1: 'Could not save decision' });
      } finally {
        setSaving(false);
      }
    };

    const handleCreateTask = async () => {
      if (!message || !taskTitle.trim() || !taskAssignee) return;
      setSaving(true);
      try {
        await createTask(parentCollection, parentId, message.id, message.text, taskTitle.trim(), taskAssignee.uid, taskDueAt, myUid);
        Toast.show({ type: 'success', text1: 'Task created' });
        closeAndReset();
      } catch {
        Toast.show({ type: 'error', text1: 'Could not create task' });
      } finally {
        setSaving(false);
      }
    };

    const handleSetFollowUp = async () => {
      if (!message || !followUpAt) return;
      setSaving(true);
      try {
        await createFollowUp(myUid, parentId, parentCollection === 'groups', message.id, message.text, followUpAt);
        Toast.show({ type: 'success', text1: 'Follow-up set', text2: followUpAt.toLocaleString() });
        closeAndReset();
      } catch {
        Toast.show({ type: 'error', text1: 'Could not set follow-up' });
      } finally {
        setSaving(false);
      }
    };

    const menuOption = (Icon: typeof Question, label: string, sub: string, onPress: () => void) => (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <Icon size={20} color={colors.foreground} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" style={{ fontSize: 15, color: colors.foreground }}>
            {label}
          </AppText>
          <AppText muted style={{ fontSize: 12 }}>
            {sub}
          </AppText>
        </View>
      </Pressable>
    );

    const header = mode !== 'menu' ? (
      <Pressable onPress={() => setMode('menu')} style={styles.backRow} hitSlop={8}>
        <CaretLeft size={18} color={colors.mutedForeground} />
        <AppText muted style={{ fontSize: 13 }}>
          Back
        </AppText>
      </Pressable>
    ) : null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['45%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.background, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.6} />
        )}
        onClose={() => setMode('menu')}
      >
        <BottomSheetView style={styles.content}>
          {header}
          {mode === 'menu' ? (
            <>
              <AppText weight="bold" style={[styles.title, { color: colors.foreground }]}>
                Mark this message as…
              </AppText>
              {menuOption(Question, 'Question', 'Track it in Open Questions', () => setMode('question'))}
              {menuOption(Flag, 'Decision', 'Record it in Decisions', () => setMode('decision'))}
              {menuOption(ListChecks, 'Task', 'Assign it with a due date', () => setMode('task'))}
              {menuOption(BellRinging, 'Follow-up', 'Remind me about this later', () => setMode('followup'))}
            </>
          ) : mode === 'question' ? (
            <>
              <AppText weight="bold" style={[styles.title, { color: colors.foreground }]}>
                Mark as Question
              </AppText>
              <AppText muted style={{ fontSize: 13.5, marginBottom: 16 }}>
                "{message?.text}"
              </AppText>
              <Pressable disabled={saving} onPress={handleMarkQuestion} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                <AppText weight="bold" style={{ color: '#fff' }}>
                  Mark as Question
                </AppText>
              </Pressable>
            </>
          ) : mode === 'decision' ? (
            <>
              <AppText weight="bold" style={[styles.title, { color: colors.foreground }]}>
                Record Decision
              </AppText>
              <TextInput
                value={decisionSummary}
                onChangeText={setDecisionSummary}
                multiline
                style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.input }]}
                placeholderTextColor={colors.mutedForeground}
              />
              <Pressable disabled={saving || !decisionSummary.trim()} onPress={handleSaveDecision} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                <AppText weight="bold" style={{ color: '#fff' }}>
                  Save Decision
                </AppText>
              </Pressable>
            </>
          ) : mode === 'task' ? (
            <>
              <AppText weight="bold" style={[styles.title, { color: colors.foreground }]}>
                Create Task
              </AppText>
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.input }]}
                placeholder="Task title"
                placeholderTextColor={colors.mutedForeground}
              />
              <AppText muted style={{ fontSize: 12, marginBottom: 6 }}>
                Assign to
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {assignees.map((a) => (
                  <Pressable
                    key={a.uid}
                    onPress={() => setTaskAssignee(a)}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      taskAssignee?.uid === a.uid && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <AppText style={{ fontSize: 13, color: taskAssignee?.uid === a.uid ? '#fff' : colors.foreground }}>{a.name}</AppText>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={async () => setTaskDueAt(await pickDateTime(new Date()))}
                style={[styles.input, { justifyContent: 'center', backgroundColor: colors.input }]}
              >
                <AppText style={{ color: taskDueAt ? colors.foreground : colors.mutedForeground }}>
                  {taskDueAt ? `Due ${taskDueAt.toLocaleString()}` : 'Set due date (optional)'}
                </AppText>
              </Pressable>
              <Pressable
                disabled={saving || !taskTitle.trim() || !taskAssignee}
                onPress={handleCreateTask}
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12 }]}
              >
                <AppText weight="bold" style={{ color: '#fff' }}>
                  Create Task
                </AppText>
              </Pressable>
            </>
          ) : (
            <>
              <AppText weight="bold" style={[styles.title, { color: colors.foreground }]}>
                Set Follow-up
              </AppText>
              <AppText muted style={{ fontSize: 13.5, marginBottom: 16 }}>
                "{message?.text}"
              </AppText>
              <Pressable
                onPress={async () => setFollowUpAt(await pickDateTime(new Date()))}
                style={[styles.input, { justifyContent: 'center', backgroundColor: colors.input }]}
              >
                <AppText style={{ color: followUpAt ? colors.foreground : colors.mutedForeground }}>
                  {followUpAt ? followUpAt.toLocaleString() : 'Pick date & time'}
                </AppText>
              </Pressable>
              <Pressable
                disabled={saving || !followUpAt}
                onPress={handleSetFollowUp}
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12 }]}
              >
                <AppText weight="bold" style={{ color: '#fff' }}>
                  Set Follow-up
                </AppText>
              </Pressable>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { fontSize: 18, marginBottom: 12, paddingHorizontal: 4 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textArea: { minHeight: 90, borderRadius: 12, padding: 12, fontSize: 14.5, marginBottom: 16, textAlignVertical: 'top' },
  input: { height: 46, borderRadius: 12, paddingHorizontal: 14, fontSize: 14.5, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  primaryButton: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
