/** Dev/local auth helpers. Active only when VITE_AUTH_MODE === 'local'. */
export type DevSlot = 'a' | 'b';

export const isLocalAuth = import.meta.env.VITE_AUTH_MODE === 'local';

interface DevUser {
  email: string;
  password: string;
}

export const devUsers: Record<DevSlot, DevUser> = {
  a: {
    email: import.meta.env.VITE_DEV_USER_A_EMAIL ?? 'vicente@katitos.local',
    password: import.meta.env.VITE_DEV_USER_A_PASSWORD ?? 'katitos123',
  },
  b: {
    email: import.meta.env.VITE_DEV_USER_B_EMAIL ?? 'anastasia@katitos.local',
    password: import.meta.env.VITE_DEV_USER_B_PASSWORD ?? 'katitos123',
  },
};

const SLOT_KEY = 'katitos-dev-slot';

export function getDevSlot(): DevSlot {
  const v = localStorage.getItem(SLOT_KEY);
  return v === 'b' ? 'b' : 'a';
}

export function setDevSlot(slot: DevSlot): void {
  localStorage.setItem(SLOT_KEY, slot);
}
