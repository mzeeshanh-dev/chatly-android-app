/**
 * Chat attachment picking + upload — image, generic file, voice note. All
 * three funnel through the same uploadChatMedia() call (see lib/api.ts),
 * which streams the file straight to the web app's /api/upload/chat-media
 * route, enforcing the same 10MB cap client-side (fast feedback) and
 * server-side (defense in depth).
 */
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types as documentTypes, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import AudioRecorderPlayer from 'react-native-nitro-sound';
import Toast from 'react-native-toast-message';
import { MAX_UPLOAD_BYTES } from '../config/constants';
import { uploadChatMedia } from './api';
import type { MessageMediaMeta } from './firestore';
import { PermissionsAndroid, Platform } from 'react-native';

export type PickedMediaType = 'image' | 'file' | 'voice';

export interface PickedMedia {
  mediaType: PickedMediaType;
  uri: string;
  fileName?: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number;
}

function warnTooLarge() {
  Toast.show({ type: 'error', text1: 'File too large', text2: 'Chatly supports attachments up to 10MB.' });
}

export async function pickImage(): Promise<PickedMedia | null> {
  const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  const sizeBytes = asset.fileSize ?? 0;
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    warnTooLarge();
    return null;
  }
  return { mediaType: 'image', uri: asset.uri, fileName: asset.fileName, mimeType: asset.type ?? 'image/jpeg', sizeBytes };
}

export async function pickFile(): Promise<PickedMedia | null> {
  try {
    const [result] = await pick({ type: [documentTypes.allFiles] });
    if (!result) return null;

    const sizeBytes = result.size ?? 0;
    if (sizeBytes > MAX_UPLOAD_BYTES) {
      warnTooLarge();
      return null;
    }
    return {
      mediaType: 'file',
      uri: result.uri,
      fileName: result.name ?? 'file',
      mimeType: result.type ?? 'application/octet-stream',
      sizeBytes,
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
    throw error;
  }
}

const voiceRecorder = AudioRecorderPlayer;

export async function startVoiceRecording(): Promise<void> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Chatly needs access to your microphone to record voice messages.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Microphone permission denied');
    }
  }
  await voiceRecorder.startRecorder(undefined, { AudioEncodingBitRate: 64000 });
}

export async function stopVoiceRecording(durationMs: number): Promise<PickedMedia | null> {
  const uri = await voiceRecorder.stopRecorder();
  const stat = await RNFS.stat(uri.replace('file://', ''));
  const sizeBytes = Number(stat.size ?? 0);
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    warnTooLarge();
    return null;
  }
  return { mediaType: 'voice', uri, mimeType: 'audio/mp4', sizeBytes, durationMs };
}

export async function cancelVoiceRecording(): Promise<void> {
  try {
    const uri = await voiceRecorder.stopRecorder();
    await RNFS.unlink(uri.replace('file://', '')).catch(() => undefined);
  } catch {
    // Nothing was recording — fine to ignore.
  }
}

export interface UploadedChatMedia {
  mediaType: PickedMediaType;
  mediaUrl: string;
  mediaMeta: MessageMediaMeta;
}

export async function uploadPickedMedia(
  picked: PickedMedia,
  chatId: string,
  isGroup: boolean
): Promise<UploadedChatMedia> {
  const result = await uploadChatMedia({
    uri: picked.uri,
    fileName: picked.fileName ?? `${picked.mediaType}-${Date.now()}`,
    mimeType: picked.mimeType,
    mediaType: picked.mediaType,
    chatId,
    isGroup,
  });

  const mediaMeta: Record<string, any> = {
    fileName: picked.fileName,
    sizeBytes: result.sizeBytes,
    mimeType: picked.mimeType,
    durationMs: picked.durationMs,
    publicId: result.publicId,
  };

  Object.keys(mediaMeta).forEach(key => {
    if (mediaMeta[key] === undefined) {
      delete mediaMeta[key];
    }
  });

  return {
    mediaType: picked.mediaType,
    mediaUrl: result.url,
    mediaMeta: mediaMeta as MessageMediaMeta,
  };
}
