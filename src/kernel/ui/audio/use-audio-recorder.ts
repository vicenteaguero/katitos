import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A finished recording: the bytes, plus what they ACTUALLY are.
 *
 * The mime type is not decoration. Every browser records whatever container it
 * feels like — Chrome gives WebM/Opus, Safari gives MP4/AAC — and a clip stored
 * under the wrong name or the wrong `Content-Type` simply refuses to play on
 * the other person's phone. So the recorder reports the truth and the caller
 * stores it.
 */
export interface AudioClip {
  blob: Blob;
  /** e.g. 'audio/webm;codecs=opus' or 'audio/mp4'. */
  mime: string;
  /** File extension matching `mime` — 'webm' | 'mp4' | 'm4a' | 'ogg' | 'wav'. */
  ext: string;
  durationMs: number;
}

export interface AudioRecorderState {
  recording: boolean;
  clip: AudioClip | null;
  /** Milliseconds elapsed while recording (live), for a timer. */
  elapsedMs: number;
  supported: boolean;
  /** Set when the mic was refused or the recorder blew up. */
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/**
 * Container types we're willing to record, best first. Opus in WebM is the
 * smallest and is what Chrome/Android produce; MP4/AAC is the ONLY thing iOS
 * Safari can make. Everything else is a long-tail fallback.
 */
const CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
] as const;

/** Extension for a mime type, ignoring the `;codecs=…` suffix. */
export function extForMime(mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();
  switch (base) {
    case 'audio/webm':
      return 'webm';
    case 'audio/mp4':
    case 'audio/aac':
    case 'audio/x-m4a':
      return 'm4a';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/wav':
    case 'audio/wave':
      return 'wav';
    default:
      return 'webm';
  }
}

/** The first container this browser will actually record, or '' to let it pick. */
function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of CANDIDATES) {
    if (MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return '';
}

/**
 * Record an audio clip, honestly labelled.
 *
 * The old version passed no mime to MediaRecorder and then wrapped the chunks
 * in `new Blob(…, { type: 'audio/webm' })` — so every clip her iPhone made was
 * AAC bytes wearing a WebM label, saved as `.webm`, served as `audio/webm`.
 * Nothing could play them. Here the container is negotiated up front and the
 * real type travels with the blob.
 */
export function useAudioRecorder(): AudioRecorderState {
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState<AudioClip | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  const stopTicking = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = undefined;
  }, []);

  // A recorder still holding the microphone after the screen is gone keeps the
  // little red pill lit on iOS, which is alarming and entirely our fault.
  useEffect(
    () => () => {
      stopTicking();
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      rec?.stream.getTracks().forEach((t) => t.stop());
    },
    [stopTicking]
  );

  const start = useCallback(async () => {
    if (!supported) return;
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Used to reject into a bare `void start()` — unhandled, and the user saw
      // nothing at all happen.
      setError('No microphone. Check the permission for this app.');
      return;
    }

    try {
      const mime = pickMime();
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : {}
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // `recorder.mimeType` is what the browser REALLY used, which is not
        // always what we asked for.
        const type = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setClip({
          blob,
          mime: type,
          ext: extForMime(type),
          durationMs: Math.round(performance.now() - startedAtRef.current),
        });
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.onerror = () => {
        setError('Recording stopped unexpectedly.');
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        stopTicking();
      };
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      recorder.start();
      setClip(null);
      setElapsedMs(0);
      setRecording(true);
      stopTicking();
      tickRef.current = setInterval(
        () =>
          setElapsedMs(Math.round(performance.now() - startedAtRef.current)),
        200
      );
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError("This browser can't record audio.");
    }
  }, [supported, stopTicking]);

  const stop = useCallback(() => {
    stopTicking();
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    setRecording(false);
  }, [stopTicking]);

  const reset = useCallback(() => {
    setClip(null);
    setElapsedMs(0);
    setError(null);
  }, []);

  return { recording, clip, elapsedMs, supported, error, start, stop, reset };
}
