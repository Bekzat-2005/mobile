import { Audio } from 'expo-av';
import { File } from 'expo-file-system';

export type RecordingHandle = {
  recording: Audio.Recording;
  startedAt: number;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}

export async function requestMicrophonePermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export async function startAudioRecording(): Promise<RecordingHandle> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  return { recording, startedAt: Date.now() };
}

export async function stopAudioRecording(handle: RecordingHandle): Promise<{
  dataUrl: string;
  fileName: string;
  durationMs: number;
}> {
  await handle.recording.stopAndUnloadAsync();
  const uri = handle.recording.getURI();
  if (!uri) {
    throw new Error('Не удалось получить запись');
  }

  const file = new File(uri);
  const bytes = await file.bytes();
  const base64 = bytesToBase64(bytes);

  const mime = 'audio/m4a';
  const dataUrl = `data:${mime};base64,${base64}`;
  const durationMs = Math.max(Date.now() - handle.startedAt, 0);

  return {
    dataUrl,
    fileName: `interview_${Date.now()}.m4a`,
    durationMs,
  };
}
