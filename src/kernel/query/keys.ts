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
  vpn: {
    all: () => ['vpn'] as const,
    status: () => ['vpn', 'status'] as const,
    /** My own subscription row. RLS means this is never the other's. */
    client: () => ['vpn', 'client'] as const,
    /** Whether THIS device is coming out through one of them, right now. */
    where: () => ['vpn', 'where'] as const,
  },
  polaroids: {
    all: () => ['polaroids'] as const,
    byDay: (day: string) => ['polaroids', 'day', day] as const,
    openDays: (key: string) => ['polaroids', 'open-days', key] as const,
    list: () => ['polaroids', 'list'] as const,
    /** The paginated album. Separate from `list` so warming can't evict it. */
    pages: () => ['polaroids', 'pages'] as const,
  },
  deck: {
    all: () => ['deck'] as const,
    one: (deckId: string) => ['deck', deckId] as const,
    cards: (deckId: string) => ['deck', deckId, 'cards'] as const,
    responses: (deckId: string) => ['deck', deckId, 'responses'] as const,
    list: (kind?: string) => ['deck', 'list', kind ?? 'all'] as const,
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
  trips: {
    all: () => ['trips'] as const,
    list: () => ['trips', 'list'] as const,
    one: (slugOrId: string) => ['trips', slugOrId] as const,
    items: (tripId: string) => ['trips', tripId, 'items'] as const,
    photos: (tripId: string) => ['trips', tripId, 'photos'] as const,
    legs: (tripId: string) => ['trips', tripId, 'legs'] as const,
    reviews: (tripId: string) => ['trips', tripId, 'reviews'] as const,
    sprints: (tripId: string) => ['trips', tripId, 'sprints'] as const,
    lines: (sprintId: string) =>
      ['trips', 'sprint', sprintId, 'lines'] as const,
    packing: (tripId: string) => ['trips', tripId, 'packing'] as const,
  },
  work: {
    all: () => ['work'] as const,
    week: (weekStart: string) => ['work', 'week', weekStart] as const,
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
  currency: {
    rates: () => ['currency', 'rates'] as const,
  },
  love: {
    all: () => ['love'] as const,
    phrases: () => ['love', 'phrases'] as const,
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
  lang: {
    all: () => ['lang'] as const,
    courses: () => ['lang', 'courses'] as const,
    course: (id: string) => ['lang', 'course', id] as const,
    units: (courseId: string) => ['lang', 'course', courseId, 'units'] as const,
    lesson: (id: string) => ['lang', 'lesson', id] as const,
    /**
     * Deliberately NOT under `lesson(id)`: that key is invalidated by every
     * edit in the builder, and attempts nested beneath it were wiped along
     * with it - his answers refetched mid-lesson because she fixed a typo.
     * (The album keys below learned the same lesson: a prefix is an
     * invalidation.)
     */
    attempts: (lessonId: string) => ['lang', 'attempts', lessonId] as const,
    progress: () => ['lang', 'progress'] as const,
    vocab: () => ['lang', 'vocab'] as const,
    /** Not under `vocab()` - adding a word must not refetch every review row. */
    vocabReviews: () => ['lang', 'reviews'] as const,
    /** The recordings of one word, by either of us. */
    voice: (vocabId: string) => ['lang', 'voice', vocabId] as const,
    media: (courseId: string) => ['lang', 'course', courseId, 'media'] as const,
    alphabet: () => ['lang', 'alphabet'] as const,
  },
  album: {
    all: () => ['album'] as const,
    book: (scope: string, key: string) =>
      ['album', 'book', scope, key] as const,
    pages: (bookId: string) => ['album', 'book', bookId, 'pages'] as const,
    /**
     * The shelf, and a book resolved by id.
     *
     * Deliberately NOT ['album','book',id]: that is a PREFIX of `pages(id)`,
     * so invalidating one would silently wipe the other.
     */
    books: () => ['album', 'books'] as const,
    /** Every photo uploaded into one book, page or no page. */
    library: (bookId: string) => ['album', 'book', bookId, 'library'] as const,
    byId: (id: string) => ['album', 'books', 'byId', id] as const,
  },
} as const;
