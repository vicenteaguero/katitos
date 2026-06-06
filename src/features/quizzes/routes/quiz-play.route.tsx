import { Link, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { Empty } from '@kernel/ui';
import { DeckPlayer } from '../components/deck-player';

export function QuizPlayRoute() {
  const { deckId } = useParams<{ deckId: string }>();
  if (!deckId) return <Empty icon="❓" title="No quiz selected" />;

  return (
    <div className="space-y-4">
      <Link
        to="/quizzes"
        className="inline-flex items-center gap-1 text-sm text-muted"
      >
        <ChevronLeft size={16} /> All quizzes
      </Link>
      <DeckPlayer deckId={deckId} />
    </div>
  );
}
