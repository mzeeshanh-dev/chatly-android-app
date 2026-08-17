import React, { useState } from 'react';
import { View, Pressable, Image, Linking } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CheckCircle, FileText, Play, Pause, DownloadSimple } from 'phosphor-react-native';
import AudioRecorderPlayer from 'react-native-nitro-sound';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { TickIcon } from './TickIcon';
import { sharedColors } from '../theme/tokens';
import type { MessageMediaMeta } from '../lib/firestore';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms?: number): string {
  if (!ms) return '0:00';
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function VoiceMessagePlayer({ uri, durationMs, tint }: { uri: string; durationMs?: number; tint: string }) {
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    if (playing) {
      await AudioRecorderPlayer.stopPlayer();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    await AudioRecorderPlayer.startPlayer(uri);
    AudioRecorderPlayer.addPlayBackListener((meta) => {
      if (meta.currentPosition >= meta.duration && meta.duration > 0) {
        AudioRecorderPlayer.stopPlayer();
        AudioRecorderPlayer.removePlayBackListener();
        setPlaying(false);
      }
    });
  };

  return (
    <Pressable onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? <Pause size={14} color={tint} weight="fill" /> : <Play size={14} color={tint} weight="fill" />}
      </View>
      <AppText style={{ fontSize: 13, color: tint }}>{formatDuration(durationMs)} · Voice message</AppText>
    </Pressable>
  );
}

interface MessageBubbleProps {
  text: string;
  sent: boolean;
  time: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
  type?: 'text' | 'system';
  senderName?: string;
  showSenderName?: boolean;
  forwarded?: boolean;
  edited?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  mediaType?: 'image' | 'file' | 'voice';
  mediaUrl?: string;
  mediaMeta?: MessageMediaMeta;
  onLongPress?: () => void;
  onPress?: () => void;
}

export const MessageBubble = React.memo(function MessageBubble({
  text,
  sent,
  time,
  status,
  type,
  senderName,
  showSenderName,
  forwarded,
  edited,
  selected,
  selectionMode,
  mediaType,
  mediaUrl,
  mediaMeta,
  onLongPress,
  onPress,
}: MessageBubbleProps) {
  const { colors } = useTheme();
  const textTint = sent ? '#ffffff' : colors.bubbleReceivedText;

  if (type === 'system') {
    return (
      <View style={{ alignItems: 'center', marginVertical: 12, paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: colors.muted, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
          <AppText muted style={{ fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {text}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18).mass(0.6)}
      style={{ flexDirection: 'row', justifyContent: sent ? 'flex-end' : 'flex-start', paddingHorizontal: 12, marginVertical: 2 }}
    >
      <Pressable onLongPress={onLongPress} onPress={onPress} style={{ maxWidth: '82%' }}>
        <View
          style={[
            {
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 18,
              position: 'relative',
            },
            sent
              ? { backgroundColor: sharedColors.bubbleSent, borderBottomRightRadius: 4 }
              : {
                  backgroundColor: colors.bubbleReceivedBg,
                  borderWidth: 1,
                  borderColor: colors.bubbleReceivedBorder,
                  borderBottomLeftRadius: 4,
                },
            selected && { borderWidth: 2, borderColor: '#10b981' },
            selectionMode && !selected && { opacity: 0.7 },
          ]}
        >
          {selected ? (
            <View
              style={{
                position: 'absolute',
                top: -8,
                [sent ? 'left' : 'right']: -8,
                backgroundColor: '#10b981',
                borderRadius: 999,
                width: 18,
                height: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={13} weight="fill" color="#fff" />
            </View>
          ) : null}

          {showSenderName && senderName ? (
            <AppText weight="bold" style={{ fontSize: 11, color: '#10b981', marginBottom: 2 }}>
              {senderName}
            </AppText>
          ) : null}

          {forwarded ? (
            <AppText style={{ fontSize: 10.5, fontStyle: 'italic', opacity: 0.6, color: sent ? '#fff' : colors.mutedForeground, marginBottom: 2 }}>
              Forwarded
            </AppText>
          ) : null}

          {mediaType === 'image' && mediaUrl ? (
            <Image source={{ uri: mediaUrl }} style={{ width: 220, height: 220, borderRadius: 12, marginBottom: text ? 6 : 0 }} resizeMode="cover" />
          ) : mediaType === 'file' && mediaUrl ? (
            <Pressable onPress={() => Linking.openURL(mediaUrl)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160 }}>
              <FileText size={26} color={textTint} weight="fill" />
              <View style={{ flex: 1 }}>
                <AppText numberOfLines={1} style={{ fontSize: 13.5, color: textTint }}>
                  {mediaMeta?.fileName ?? 'File'}
                </AppText>
                <AppText style={{ fontSize: 11, opacity: 0.7, color: textTint }}>{formatBytes(mediaMeta?.sizeBytes ?? 0)}</AppText>
              </View>
              <DownloadSimple size={16} color={textTint} />
            </Pressable>
          ) : mediaType === 'voice' && mediaUrl ? (
            <VoiceMessagePlayer uri={mediaUrl} durationMs={mediaMeta?.durationMs} tint={textTint} />
          ) : null}

          {text ? (
            <AppText style={{ fontSize: 15, lineHeight: 20, color: sent ? '#ffffff' : colors.bubbleReceivedText, marginTop: mediaType ? 2 : 0 }}>
              {text}
            </AppText>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 5 }}>
            {edited ? (
              <AppText style={{ fontSize: 10, opacity: 0.6, color: sent ? '#fff' : colors.mutedForeground }}>Edited</AppText>
            ) : null}
            <AppText style={{ fontSize: 10.5, opacity: 0.7, color: sent ? '#fff' : colors.mutedForeground }}>{time}</AppText>
            {sent ? <TickIcon status={status} /> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});
