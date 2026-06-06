import { useCallback, useRef, useState } from 'react';

export interface AudioRecorderState {
  recording: boolean;
  blob: Blob | null;
  durationMs: number;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/** Minimal MediaRecorder wrapper producing a webm/opus audio Blob. */
export function useAudioRecorder(): AudioRecorderState {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  const start = useCallback(async () => {
    if (!supported) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      setBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
      setDurationMs(performance.now() - startedAtRef.current);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    recorder.start();
    setBlob(null);
    setRecording(true);
  }, [supported]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    setRecording(false);
  }, []);

  const reset = useCallback(() => {
    setBlob(null);
    setDurationMs(0);
  }, []);

  return { recording, blob, durationMs, supported, start, stop, reset };
}
