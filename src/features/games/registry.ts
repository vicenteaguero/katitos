import { createGameRegistry } from '@kernel/registry';
import { memoryMatchGame } from './games/memory-match';
import { reactionGame } from './games/reaction';

/**
 * The game registry lives inside the games feature (games are part of it).
 * Adding a game = build a PlayComponent + defineGame + one entry here.
 */
export const gameRegistry = createGameRegistry([memoryMatchGame, reactionGame]);
