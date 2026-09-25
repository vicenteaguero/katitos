/**
 * Who is who, and which words go with them.
 *
 * Role 'a' is Vicente, who is Katito, and he is he. Role 'b' is Anastasia, who
 * is Katita, and she is she. Every partner-facing line in this feature goes
 * through here, because "still yesterday for her" hard-coded into a component
 * is right for exactly one of the two people reading it.
 */
export type Role = string | null | undefined;

export interface Pronouns {
  subject: string;
  object: string;
  possessive: string;
}

const HE: Pronouns = { subject: 'he', object: 'him', possessive: 'his' };
const SHE: Pronouns = { subject: 'she', object: 'her', possessive: 'her' };
/** Neither role loaded yet: say nothing about anyone's gender. */
const THEY: Pronouns = { subject: 'they', object: 'them', possessive: 'their' };

export function pronouns(role: Role): Pronouns {
  if (role === 'a') return HE;
  if (role === 'b') return SHE;
  return THEY;
}

/** The name we actually call each other. */
export function petName(role: Role): string {
  if (role === 'a') return 'Katito';
  if (role === 'b') return 'Katita';
  return 'your love';
}
