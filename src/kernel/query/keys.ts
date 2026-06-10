/**
 * Central query-key factory. Each feature namespaces its keys here so
 * invalidation is surgical and collisions are impossible.
 *
 * Convention: `qk.<feature>.<scope>(...args)` returns a readonly tuple.
 */
export const qk = {
  couple: {
    self: () => ['couple'] as const,
    members: () => ['couple', 'members'] as const,
  },
  countdowns: {
    all: () => ['countdowns'] as const,
    list: () => ['countdowns', 'list'] as const,
  },
  polaroids: {
    all: () => ['polaroids'] as const,
    byDay: (day: string) => ['polaroids', 'day', day] as const,
    list: () => ['polaroids', 'list'] as const,
  },
  deck: {
    all: () => ['deck'] as const,
    one: (deckId: string) => ['deck', deckId] as const,
    cards: (deckId: string) => ['deck', deckId, 'cards'] as const,
    responses: (deckId: string) => ['deck', deckId, 'responses'] as const,
    list: (kind?: string) => ['deck', 'list', kind ?? 'all'] as const,
  },
  games: {
    leaderboard: (gameId: string) => ['games', gameId, 'leaderboard'] as const,
  },
  presence: {
    appOpens: () => ['presence', 'app-opens'] as const,
  },
  chalkboard: {
    notes: () => ['chalkboard', 'notes'] as const,
  },
  flowers: {
    list: () => ['flowers', 'list'] as const,
  },
  fights: {
    all: () => ['fights'] as const,
    active: () => ['fights', 'active'] as const,
    list: () => ['fights', 'list'] as const,
  },
  punitos: {
    list: () => ['punitos', 'list'] as const,
  },
  decisions: {
    all: () => ['decisions'] as const,
    list: () => ['decisions', 'list'] as const,
    positions: (decisionId: string) =>
      ['decisions', decisionId, 'positions'] as const,
  },
  babyNames: {
    all: () => ['baby-names'] as const,
    list: () => ['baby-names', 'list'] as const,
  },
  cuteWords: {
    list: () => ['cute-words', 'list'] as const,
  },
  ideas: {
    list: () => ['ideas', 'list'] as const,
  },
  finance: {
    goals: () => ['finance', 'goals'] as const,
    contributions: (goalId: string) =>
      ['finance', goalId, 'contributions'] as const,
  },
  trips: {
    all: () => ['trips'] as const,
    list: () => ['trips', 'list'] as const,
    one: (slugOrId: string) => ['trips', slugOrId] as const,
    items: (tripId: string) => ['trips', tripId, 'items'] as const,
  },
  dates: {
    all: () => ['dates'] as const,
    list: () => ['dates', 'list'] as const,
    one: (id: string) => ['dates', id] as const,
  },
  scavenger: {
    all: () => ['scavenger'] as const,
    cards: () => ['scavenger', 'cards'] as const,
  },
  wishlists: {
    all: () => ['wishlists'] as const,
    list: () => ['wishlists', 'list'] as const,
    items: (listId: string) => ['wishlists', listId, 'items'] as const,
  },
  phrases: {
    list: (language?: string) =>
      ['phrases', 'list', language ?? 'all'] as const,
  },
  currency: {
    rates: () => ['currency', 'rates'] as const,
  },
  tree: {
    all: () => ['tree'] as const,
    state: () => ['tree', 'state'] as const,
    waterings: () => ['tree', 'waterings'] as const,
    milestones: () => ['tree', 'milestones'] as const,
  },
  knowMe: {
    all: () => ['know-me'] as const,
    today: () => ['know-me', 'today'] as const,
    myAnswer: (dayId: string) => ['know-me', dayId, 'mine'] as const,
    reveal: (dayId: string) => ['know-me', dayId, 'reveal'] as const,
    history: () => ['know-me', 'history'] as const,
    stats: () => ['know-me', 'stats'] as const,
  },
  album: {
    all: () => ['album'] as const,
    chapters: () => ['album', 'chapters'] as const,
    slots: () => ['album', 'slots'] as const,
    stickers: () => ['album', 'stickers'] as const,
  },
} as const;
