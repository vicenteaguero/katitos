/** Storage bucket names (single source of truth) + typed path builders. */
export const BUCKETS = {
  polaroids: 'polaroids',
  flowers: 'flowers',
  quizMedia: 'quiz-media',
  languageAudio: 'language-audio',
  languageMedia: 'language-media',
  scavengerProof: 'scavenger-proof',
  georgiaAlbum: 'georgia-album',
  datesAlbum: 'dates-album',
  avatars: 'avatars',
  album: 'album',
  wishlist: 'wishlist',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export const storagePaths = {
  quizImage: (deckId: string, cardId: string) => `${deckId}/${cardId}.jpg`,
  quizAudio: (deckId: string, cardId: string, ext = 'webm') =>
    `${deckId}/${cardId}.${ext}`,
  /**
   * A pronunciation clip. The extension is whatever the recorder actually
   * produced — iOS makes MP4/AAC, Chrome makes WebM — because a clip stored
   * under the wrong name is a clip the other phone silently refuses to play.
   *
   * `id` must be UNIQUE PER RECORDING (`<rowId>-<nanoid>`), never just the
   * row id: a re-recording that overwrote the same path was served from the
   * browser's cache as the old clip for an hour, and every caller had to
   * record twice. The old object is removed by whoever replaces it.
   */
  languageAudio: (id: string, ext = 'webm') => `${id}.${ext}`,
  /** His answer to a "say it" question — the recording she marks. */
  languageSpeech: (id: string, ext: string) => `speech/${id}.${ext}`,
  /** One of us saying a word for the other: a try, or the answer to one. */
  languageVoice: (id: string, ext: string) => `voice/${id}.${ext}`,
  /** A lesson attachment: a PDF, a doc, an image, a video she uploaded. */
  languageMedia: (courseId: string, fileId: string, ext: string) =>
    `${courseId}/${fileId}.${ext}`,
  scavengerProof: (cardId: string) => `${cardId}.jpg`,
  /** Photo of the physical date-card (same bucket, distinct prefix). */
  scavengerCardImage: (cardId: string) => `card/${cardId}.jpg`,
  datePhoto: (dateId: string, fileId: string) => `${dateId}/${fileId}.jpg`,
  /** A place review's single photo (same georgia-album bucket, reviews/ prefix). */
  tripReview: (reviewId: string) => `reviews/${reviewId}.jpg`,
  /** An itinerary item's single photo. */
  tripItemPhoto: (itemId: string) => `items/${itemId}.jpg`,
  /** A photo placed in a 3D album book page slot. */
  albumPhoto: (bookId: string, photoId: string) =>
    `book/${bookId}/${photoId}.jpg`,
  /** Know-Me reveal reaction selfie, one per day per user. */
  knowMeReaction: (dayId: string, userId: string) =>
    `know-me/${dayId}/${userId}.jpg`,
  /** Optional image for a couple-authored Know-Me question option. */
  knowMeOption: (questionId: string, optionId: string) =>
    `know-me/q/${questionId}/${optionId}.jpg`,
};
