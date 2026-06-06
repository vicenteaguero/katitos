import { useEffect, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '../button';
import { useAudioRecorder } from './use-audio-recorder';

/** Record an audio clip and hand the Blob back via onRecorded. */
export function AudioRecorder({
  onRecorded,
}: {
  onRecorded: (blob: Blob | null) => void;
}) {
  const { recording, blob, supported, start, stop, reset } = useAudioRecorder();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    onRecorded(blob);
    if (blob) {
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(null);
  }, [blob, onRecorded]);

  if (!supported) {
    return <p className="text-xs text-muted">Recording not supported here.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {recording ? (
          <Button variant="danger" size="sm" onClick={stop}>
            <Square size={16} /> Stop
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => void start()}>
            <Mic size={16} /> {blob ? 'Re-record' : 'Record'}
          </Button>
        )}
        {blob && (
          <button
            type="button"
            aria-label="Discard recording"
            onClick={reset}
            className="text-muted"
          >
            <Trash2 size={16} />
          </button>
        )}
        {recording && (
          <span className="flex items-center gap-1 text-xs text-danger">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
            recording…
          </span>
        )}
      </div>
      {url && <audio src={url} controls className="w-full" />}
    </div>
  );
}
