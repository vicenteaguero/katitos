import { Link, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { Empty } from '@kernel/ui';
import { DeckPlayer } from '../components/deck-player';

export function QuizPlayRoute() {
  const { deckId } = useParams<{ deckId: string }>();
  if (!deckId) return <Empty icon="❓" title="No quiz selected" />;

  return (
    <div className="curtain-reveal space-y-7">
      <Link
        to="/quizzes"
        className="lift-press inline-flex items-center gap-1 font-sans text-xs uppercase tracking-[0.16em] text-muted transition-colors hover:text-copper"
      >
        <ChevronLeft size={16} /> All quizzes
      </Link>
      <DeckPlayer deckId={deckId} />
    </div>
  );
}
