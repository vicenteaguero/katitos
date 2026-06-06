/** Storage bucket names (single source of truth) + typed path builders. */
export const BUCKETS = {
  polaroids: 'polaroids',
  flowers: 'flowers',
  quizMedia: 'quiz-media',
  languageAudio: 'language-audio',
  scavengerProof: 'scavenger-proof',
  georgiaAlbum: 'georgia-album',
  datesAlbum: 'dates-album',
  avatars: 'avatars',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export const storagePaths = {
  /** One polaroid per day → overwrite by reusing the same path. */
  polaroid: (day: string) => `${day}.jpg`,
  /** One bouquet per monthsversary. */
  flower: (occasionDate: string) => `${occasionDate}.jpg`,
  quizImage: (deckId: string, cardId: string) => `${deckId}/${cardId}.jpg`,
  quizAudio: (deckId: string, cardId: string) => `${deckId}/${cardId}.webm`,
  languageAudio: (phraseId: string) => `${phraseId}.webm`,
  scavengerProof: (cardId: string) => `${cardId}.jpg`,
  datePhoto: (dateId: string, fileId: string) => `${dateId}/${fileId}.jpg`,
  tripPhoto: (tripId: string, fileId: string) => `${tripId}/${fileId}.jpg`,
  avatar: (userId: string) => `${userId}.jpg`,
};
