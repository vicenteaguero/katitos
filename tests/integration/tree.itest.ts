import { beforeAll, describe, expect, it } from 'vitest';
import { signedInClient, supabaseReachable, USER_A, USER_B } from './helpers';

// Mirror of src/features/tree/lib/tree-growth.ts growthForWater (kept inline so
// the integration suite needs no @kernel path-alias resolution). The point of
// these assertions is that the plpgsql in 20260606000006_tree.sql produces the
// SAME numbers as this TS formula.
const growthForWater = (h: number) => 1.0 * (0.6 + 0.4 * h);

const CLEAN = {
  growth_points: 0,
  water_count: 0,
  last_watered_at: null as string | null,
  last_watered_by: null as string | null,
  current_streak: 0,
  longest_streak: 0,
  last_streak_day: null as string | null,
};

describe('water_tree RPC — alternating rule + SQL↔TS parity', () => {
  beforeAll(async () => {
    if (!(await supabaseReachable())) {
      throw new Error('Local Supabase not reachable — run `supabase start`.');
    }
  });

  it('enforces the alternating-waterer rule and the growth math', async () => {
    const a = await signedInClient(USER_A);
    const b = await signedInClient(USER_B);
    const {
      data: { user: ua },
    } = await a.auth.getUser();

    // Reset the singleton to a known clean state.
    await a.from('tree_state').update(CLEAN).eq('id', true);

    // First water (health = 1 since never watered) → growth = growthForWater(1) = 1.0.
    const { data: r1, error: e1 } = await a.rpc('water_tree');
    expect(e1).toBeNull();
    expect(r1!.last_watered_by).toBe(ua!.id);
    expect(r1!.water_count).toBe(1);
    expect(Number(r1!.growth_points)).toBeCloseTo(growthForWater(1), 6); // == 1.0, SQL↔TS parity

    // Same person again → rejected ("not your turn").
    const { error: e2 } = await a.rpc('water_tree');
    expect(e2).not.toBeNull();
    expect(e2!.message).toContain('not your turn');

    // Partner waters → allowed; growth granted is in the 0.62..1.0 band.
    const { data: r3, error: e3 } = await b.rpc('water_tree');
    expect(e3).toBeNull();
    expect(r3!.water_count).toBe(2);
    const secondGrant = Number(r3!.growth_points) - 1.0;
    expect(secondGrant).toBeGreaterThan(growthForWater(0.05) - 1e-6); // >= 0.62
    expect(secondGrant).toBeLessThanOrEqual(growthForWater(1) + 1e-6); // <= 1.0

    // Leave the tree clean for the dev app.
    await a.from('tree_state').update(CLEAN).eq('id', true);
  });
});
