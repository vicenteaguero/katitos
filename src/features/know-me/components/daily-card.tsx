import { useState } from 'react';
import { usePartner } from '@kernel/auth';
import { Button, Card, Segmented, toast } from '@kernel/ui';
import { useSubmitAnswer } from '../api/know-me.mutations';
import type { QuestionWithDay } from '../types';
import { OptionGrid } from './option-grid';

/**
 * Two private steps held in local state until one Submit:
 *   step 1 — "About you" (own truth)
 *   step 2 — "Guess {partner}" (guess of partner)
 * The partner sees nothing until submit (no choice ever leaves the device early).
 */
export function DailyCard({ today }: { today: QuestionWithDay }) {
  const { partner } = usePartner();
  const submit = useSubmitAnswer(today.dayId);
  const [step, setStep] = useState<'own' | 'guess'>('own');
  const [own, setOwn] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);

  const partnerName = partner?.display_name ?? 'them';
  const prompt = today.question.prompt;

  const onSubmit = () => {
    if (!own || !guess) return;
    submit.mutate(
      { own, guess },
      {
        onSuccess: () => toast.success('Locked in 💛'),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Card className="km-candle space-y-7">
      <Segmented
        value={step}
        onChange={setStep}
        options={[
          { value: 'own', label: 'About you' },
          { value: 'guess', label: `Guess ${partnerName}` },
        ]}
        className="w-full"
      />

      {step === 'own' ? (
        <div className="space-y-6">
          <p className="font-display text-3xl font-medium leading-tight tracking-tight text-fg">
            {prompt}
          </p>
          <OptionGrid
            options={today.options}
            selected={own}
            onSelect={setOwn}
          />
          <Button full disabled={!own} onClick={() => setStep('guess')}>
            Next: guess {partnerName}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-purple">
            What will {partnerName} say about themselves?
          </p>
          <p className="font-display text-3xl font-medium leading-tight tracking-tight text-fg">
            {prompt}
          </p>
          <OptionGrid
            options={today.options}
            selected={guess}
            onSelect={setGuess}
          />
          <Button
            full
            disabled={!own || !guess || submit.isPending}
            onClick={onSubmit}
          >
            Submit both
          </Button>
        </div>
      )}
    </Card>
  );
}
