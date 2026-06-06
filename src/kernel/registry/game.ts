import type { ComponentType } from 'react';

export interface GameResult {
  /** Numeric score recorded to the leaderboard. */
  score: number;
  meta?: Record<string, unknown>;
}

export interface GamePlayProps {
  /** Call when a round ends — the games framework persists the score. */
  onFinish: (result: GameResult) => void;
}

export interface GameModule {
  /** Unique id, e.g. 'memory-match'. */
  id: string;
  title: string;
  description?: string;
  emoji?: string;
  PlayComponent: ComponentType<GamePlayProps>;
  /** Leaderboard ranking direction. 'desc' = higher is better. */
  scoreOrder: 'asc' | 'desc';
  /** Render a raw score (e.g. '42 s', '1280 pts'). */
  formatScore?: (score: number) => string;
  enabled?: boolean;
}

type GameInput = Omit<GameModule, 'scoreOrder' | 'enabled'> & {
  scoreOrder?: 'asc' | 'desc';
  enabled?: boolean;
};

export function defineGame(g: GameInput): GameModule {
  return {
    ...g,
    enabled: g.enabled ?? true,
    scoreOrder: g.scoreOrder ?? 'desc',
  };
}

export function createGameRegistry(games: GameModule[]): {
  all: GameModule[];
  byId: (id: string) => GameModule | undefined;
} {
  const all = games.filter((g) => g.enabled !== false);
  return { all, byId: (id) => all.find((g) => g.id === id) };
}
