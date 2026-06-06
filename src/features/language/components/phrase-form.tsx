import { useCallback, useState } from 'react';
import {
  AudioRecorder,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  toast,
} from '@kernel/ui';
import { useCreatePhrase } from '../api/phrases.mutations';
import { LANG_LABELS, type Lang } from '../types';

export function PhraseForm({
  defaultLanguage = 'ru',
  onDone,
}: {
  defaultLanguage?: Lang;
  onDone: () => void;
}) {
  const create = useCreatePhrase();

  const [language, setLanguage] = useState<Lang>(defaultLanguage);
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [example, setExample] = useState('');
  const [category, setCategory] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Stable identity so AudioRecorder's effect doesn't loop.
  const handleRecorded = useCallback((blob: Blob | null) => {
    setAudioBlob(blob);
  }, []);

  const submit = async () => {
    if (!text.trim()) {
      toast.error('Add the phrase');
      return;
    }
    try {
      await create.mutateAsync({
        language,
        text: text.trim(),
        translation: translation.trim() || undefined,
        transliteration: transliteration.trim() || undefined,
        example: example.trim() || undefined,
        category: category.trim() || undefined,
        audioBlob,
      });
      toast.success('Phrase added');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Language">
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Lang)}
        >
          <option value="ru">{LANG_LABELS.ru}</option>
          <option value="es">{LANG_LABELS.es}</option>
        </Select>
      </Field>

      <Field label="Phrase">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={language === 'ru' ? 'Привет' : 'Hola'}
        />
      </Field>

      <Field label="Translation">
        <Input
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder="Hello"
        />
      </Field>

      <Field label="Transliteration">
        <Input
          value={transliteration}
          onChange={(e) => setTransliteration(e.target.value)}
          placeholder={language === 'ru' ? 'privet' : 'OH-lah'}
        />
      </Field>

      <Field label="Example">
        <Textarea
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="Use it in a sentence…"
        />
      </Field>

      <Field label="Category">
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="greetings"
        />
      </Field>

      <Field label="Say it out loud">
        <AudioRecorder onRecorded={handleRecorded} />
      </Field>

      <Button full onClick={() => void submit()} disabled={create.isPending}>
        Add phrase
      </Button>
    </div>
  );
}
