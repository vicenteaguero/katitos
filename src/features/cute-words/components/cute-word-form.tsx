import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AudioRecorder,
  type AudioClip,
  Button,
  Field,
  Input,
  Textarea,
  toast,
} from '@kernel/ui';
import { useCreateCuteWord } from '../api/cute-words.mutations';

const schema = z.object({
  term: z.string().min(1, 'Give it a word'),
  meaning: z.string().optional(),
  example: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CuteWordForm({ onDone }: { onDone: () => void }) {
  const create = useCreateCuteWord();
  const [audio, setAudio] = useState<AudioClip | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { term: '', meaning: '', example: '' },
  });

  const handleRecorded = useCallback((clip: AudioClip | null) => {
    setAudio(clip);
  }, []);

  const submit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        term: v.term,
        meaning: v.meaning,
        example: v.example,
        audio,
      });
      reset();
      setAudio(null);
      toast.success('Added');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="font-display text-lg italic leading-snug text-muted">
        Coin a word that only the two of us will ever understand.
      </p>
      <Field label="Word" error={errors.term?.message}>
        <Input placeholder="katito" {...register('term')} />
      </Field>
      <Field label="Meaning" hint="What it means to us">
        <Textarea placeholder="what it means" {...register('meaning')} />
      </Field>
      <Field label="Example" hint="How we use it">
        <Textarea placeholder="how we use it" {...register('example')} />
      </Field>
      <Field label="Say it">
        <AudioRecorder onRecorded={handleRecorded} />
      </Field>
      <Button full type="submit" disabled={isSubmitting}>
        Add to our dictionary
      </Button>
    </form>
  );
}
