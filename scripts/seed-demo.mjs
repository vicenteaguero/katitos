// Katitos — rich demo seeder (idempotent). Wipes feature tables and re-inserts
// "several of everything" + uploads fake opera-palette images to every bucket.
// Run:  set -a; eval "$(supabase status -o env)"; set +a; node scripts/seed-demo.mjs
import { createClient } from '@supabase/supabase-js';

const URL = process.env.API_URL || 'http://127.0.0.1:54321';
const KEY = process.env.SERVICE_ROLE_KEY;
if (!KEY) { console.error('SERVICE_ROLE_KEY missing'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const A = '11111111-1111-1111-1111-111111111111'; // Vicente
const B = '22222222-2222-2222-2222-222222222222'; // Anastasia
const GEORGIA = '55555555-5555-5555-5555-555555555555';

const C = {
  wine: '#6E1423', purple: '#4A2350', copper: '#B5633A', olive: '#6B7344',
  gold: '#C9A24B', brown: '#3E2218', cream: '#E8D9B5', lapis: '#16182E', dusk: '#1B0810',
};
const pick = (i) => Object.values(C)[i % Object.values(C).length];

// ── fake image: an opera-palette gradient card with an emoji + caption ──
function svg(label, emoji, c1, c2) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return Buffer.from(
`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/>
    </radialGradient>
  </defs>
  <rect width="900" height="900" fill="url(#g)"/>
  <rect width="900" height="900" fill="url(#v)"/>
  <rect x="26" y="26" width="848" height="848" fill="none" stroke="${C.gold}" stroke-width="3" stroke-opacity="0.7"/>
  <text x="450" y="470" font-size="340" text-anchor="middle" dominant-baseline="central">${esc(emoji)}</text>
  <text x="450" y="790" font-size="46" fill="${C.cream}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-style="italic" opacity="0.95">${esc(label)}</text>
</svg>`, 'utf8');
}
async function up(bucket, path, label, emoji, c1, c2) {
  const body = svg(label, emoji, c1, c2);
  const opts = { contentType: 'image/svg+xml', upsert: true };
  // Original + proxy (thumbs/<path>) so the app's proxy-first images resolve
  // without a 404→fallback round-trip.
  const a = await sb.storage.from(bucket).upload(path, body, opts);
  if (a.error) console.warn(`  upload ${bucket}/${path}: ${a.error.message}`);
  const t = await sb.storage.from(bucket).upload(`thumbs/${path}`, body, opts);
  if (t.error) console.warn(`  upload ${bucket}/thumbs/${path}: ${t.error.message}`);
}

const NIL = '00000000-0000-0000-0000-000000000000';
async function wipe(t) { const { error } = await sb.from(t).delete().neq('id', NIL); if (error) console.warn(`  wipe ${t}: ${error.message}`); }
async function ins(t, rows) { const { error } = await sb.from(t).insert(rows); if (error) { console.warn(`  insert ${t}: ${error.message}`); return false; } console.log(`  ✓ ${t} (${rows.length})`); return true; }

// date helpers (node runtime — Date allowed here)
const today = new Date();
const dstr = (offset) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const tstr = (offsetDays) => { const d = new Date(today); d.setDate(d.getDate() + offsetDays); return d.toISOString(); };

async function main() {
  console.log('Wiping feature tables…');
  for (const t of [
    'date_photos', 'date_ratings', 'dates', 'wishlist_votes', 'wishlist_items', 'wishlists',
    'trip_photos', 'trip_items',
    'scavenger_claims', 'scavenger_cards',
    'know_me_answers', 'know_me_presence', 'know_me_days',
    'polaroids', 'flowers', 'chalkboard_notes', 'phrases', 'language_decks', 'deck_responses',
    'app_opens', 'tree_waterings', 'tree_milestones',
  ]) await wipe(t);

  // ── Language: decks ("a course your love built for you") + cards ──
  {
    const dRuDaily = crypto.randomUUID();
    const dRuLove = crypto.randomUUID();
    const dEs = crypto.randomUUID();
    // Anastasia (B) builds Russian decks for Vicente; Vicente (A) builds Spanish.
    await ins('language_decks', [
      { id: dRuDaily, language: 'ru', title: 'Everyday', emoji: '☀️', description: 'The words to start our days', created_by: B },
      { id: dRuLove, language: 'ru', title: 'Sweet nothings', emoji: '💌', description: 'Say it to me in Russian', created_by: B },
      { id: dEs, language: 'es', title: 'Lo básico', emoji: '🌶️', description: 'Chilean love, español', created_by: A },
    ]);
    await ins('phrases', [
      { deck_id: dRuLove, language: 'ru', text: 'Я тебя люблю', translation: 'I love you', transliteration: 'Ya tebya lyublyu', category: 'love', added_by: B },
      { deck_id: dRuLove, language: 'ru', text: 'Скучаю по тебе', translation: 'I miss you', transliteration: 'Skuchayu po tebe', category: 'love', added_by: B },
      { deck_id: dRuLove, language: 'ru', text: 'Ты моё солнце', translation: 'You are my sun', transliteration: 'Ty moyo solntse', category: 'love', added_by: B },
      { deck_id: dRuDaily, language: 'ru', text: 'Доброе утро', translation: 'Good morning', transliteration: 'Dobroye utro', category: 'daily', added_by: B },
      { deck_id: dRuDaily, language: 'ru', text: 'Спокойной ночи', translation: 'Good night', transliteration: 'Spokoynoy nochi', category: 'daily', added_by: B },
      { deck_id: dRuDaily, language: 'ru', text: 'Как дела?', translation: 'How are you?', transliteration: 'Kak dela', category: 'daily', added_by: B },
      { deck_id: dEs, language: 'es', text: 'Te amo', translation: 'I love you', example: 'Te amo, mi vida', category: 'love', added_by: A },
      { deck_id: dEs, language: 'es', text: 'Buenos días', translation: 'Good morning', category: 'daily', added_by: A },
      { deck_id: dEs, language: 'es', text: '¿Cómo amaneciste?', translation: 'How did you wake up?', category: 'daily', added_by: A },
    ]);
  }

  // ── Wishlists ──
  {
    const l1 = crypto.randomUUID(), l2 = crypto.randomUUID();
    await ins('wishlists', [
      { id: l1, title: 'Movies to watch', category: 'movies', created_by: A },
      { id: l2, title: 'Gifts for each other', category: 'gifts', description: 'Hints, very subtle hints.', created_by: B },
    ]);
    const items = [
      { id: crypto.randomUUID(), list_id: l1, title: 'Amélie', added_by: A },
      { id: crypto.randomUUID(), list_id: l1, title: 'Past Lives', added_by: B },
      { id: crypto.randomUUID(), list_id: l1, title: 'Brokeback Mountain', added_by: B },
      { id: crypto.randomUUID(), list_id: l2, title: 'A handwritten letter', added_by: A },
      { id: crypto.randomUUID(), list_id: l2, title: 'Matryoshka with our faces', added_by: A },
      { id: crypto.randomUUID(), list_id: l2, title: 'Chilean wine', added_by: B },
    ];
    await ins('wishlist_items', items);
    const votes = [];
    for (const it of items) { if (Math.random() > 0.4) votes.push({ item_id: it.id, user_id: A, vote: 1 }); if (Math.random() > 0.4) votes.push({ item_id: it.id, user_id: B, vote: 1 }); }
    await ins('wishlist_votes', votes);
  }

  // ── Chalkboard / Fridge wall (max 3 notes; phone-friendly coords) ──
  {
    const notes = [
      { body: 'Te amo, mi vida ❤️', color: C.cream, x: 18, y: 26, rotation: -5, author: A },
      { body: 'Доброе утро, solnyshko ☀️', color: '#FFFAFA', x: 150, y: 150, rotation: 4, author: B },
      { body: 'pastel de choclo soon 🌽', color: C.gold, x: 30, y: 300, rotation: -3, author: A },
    ];
    await ins('chalkboard_notes', notes);
  }

  // ── App opens (presence) ──
  {
    const rows = [];
    for (let i = 0; i < 6; i++) { rows.push({ user_id: A, opened_at: tstr(-i) }); rows.push({ user_id: B, opened_at: tstr(-i) }); }
    rows.push({ user_id: B, opened_at: new Date(Date.now() - 5 * 60000).toISOString() });
    await ins('app_opens', rows);
  }

  // ── Tree ──
  await sb.from('tree_state').upsert({
    id: true, planted_at: tstr(-120), seed: 424242, last_watered_at: tstr(0), last_watered_by: A,
    water_count: 46, growth_points: 760, current_streak: 12, longest_streak: 21, last_streak_day: dstr(0),
  });
  {
    const w = [];
    for (let i = 0; i < 18; i++) w.push({ watered_by: i % 2 ? A : B, watered_at: tstr(-i), couple_day: dstr(-i), growth_added: 12 + Math.random() * 8, health_before: 70 + Math.random() * 30 });
    await ins('tree_waterings', w);
    await ins('tree_milestones', [
      { kind: 'stage', slot: 1, threshold: 10, title: 'First sprout', note: 'It broke the soil 🌱', emoji: '🌱', achieved_at: tstr(-110), couple_day: dstr(-110) , created_by: A },
      { kind: 'height', slot: 2, threshold: 1, title: 'One metre tall', note: 'Growing strong', emoji: '🌿', achieved_at: tstr(-60), couple_day: dstr(-60) , created_by: A },
      { kind: 'streak', slot: 3, threshold: 7, title: 'A week of care', note: '7-day watering streak', emoji: '🔥', achieved_at: tstr(-30), couple_day: dstr(-30) , created_by: B },
      { kind: 'calendar', slot: 4, threshold: null, title: 'First bloom', note: 'Our tree flowered 🌸', emoji: '🌸', achieved_at: tstr(-8), couple_day: dstr(-8) , created_by: A },
    ]);
  }

  // ── Polaroids (images: polaroids bucket, `${day}.jpg`) ──
  {
    const days = [
      ['Morning coffee, two cities', '☕'], ['Sunset on a call', '🌇'], ['Her in Novosibirsk snow', '❄️'],
      ['Him by the Pacific', '🌊'], ['Matching pajamas night', '🌙'], ['Just because', '💛'],
    ];
    const rows = [];
    for (let i = 0; i < days.length; i++) {
      const day = dstr(-i * 3); const path = `${day}.jpg`;
      await up('polaroids', path, days[i][0], days[i][1], pick(i), pick(i + 3));
      rows.push({ day, image_path: path, caption: days[i][0], taken_by: i % 2 ? B : A });
    }
    await ins('polaroids', rows);
  }

  // ── Flowers (flowers bucket, `${occasion_date}.jpg`) ──
  {
    const occ = [['15th — Tulips from afar', '🌷'], ['15th — Peonies', '🌸'], ['15th — Sunflowers', '🌻']];
    const rows = [];
    for (let i = 0; i < occ.length; i++) {
      const date = dstr(-30 * (i + 1)); const path = `${date}.jpg`;
      await up('flowers', path, occ[i][0], occ[i][1], C.olive, C.copper);
      rows.push({ occasion_date: date, image_path: path, note: occ[i][0], given_by: i % 2 ? A : B });
    }
    await ins('flowers', rows);
  }

  // ── Dates + ratings + photos ──
  {
    const dates = [
      { title: 'Virtual cooking night', place: 'Our kitchens', category: 'food', status: 'done', emoji: '🍝', photos: 2 },
      { title: 'Synchronized movie', place: 'Teleparty', category: 'movie', status: 'done', emoji: '🎬', photos: 2 },
      { title: 'Museum video tour', place: 'The Hermitage', category: 'culture', status: 'done', emoji: '🏛️', photos: 3 },
      { title: 'Picnic in Tbilisi', place: 'Georgia', category: 'outdoor', status: 'scheduled', emoji: '🧺', photos: 0 },
      { title: 'Wine tasting at home', place: 'Both homes', category: 'food', status: 'idea', emoji: '🍷', photos: 0 },
      { title: 'Stargazing call', place: 'Rooftops', category: 'outdoor', status: 'idea', emoji: '🌌', photos: 0 },
    ];
    const drows = [], rrows = [], prows = [];
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i], id = crypto.randomUUID();
      drows.push({ id, title: d.title, place: d.place, category: d.category, status: d.status,
        scheduled_at: d.status === 'scheduled' ? tstr(29) : d.status === 'done' ? tstr(-(i + 1) * 7) : null,
        what_we_ate: d.status === 'done' ? 'Something delicious' : null, created_by: i % 2 ? B : A });
      if (d.status === 'done') {
        rrows.push({ date_id: id, user_id: A, stars: 4 + (i % 2), review: 'Loved every second.' });
        rrows.push({ date_id: id, user_id: B, stars: 5, review: 'Best night. ❤️' });
      }
      for (let p = 0; p < d.photos; p++) {
        const fileId = crypto.randomUUID(); const path = `${id}/${fileId}.jpg`;
        await up('dates-album', path, `${d.title} #${p + 1}`, d.emoji, pick(i + p), pick(i + p + 2));
        prows.push({ date_id: id, image_path: path, caption: `${d.title} — ${p + 1}`, created_by: p % 2 ? B : A });
      }
    }
    await ins('dates', drows);
    await ins('date_ratings', rrows);
    await ins('date_photos', prows);
  }

  // ── Georgia trip: keep/ensure trip, add items + photos ──
  await sb.from('trips').upsert({
    id: GEORGIA, slug: 'georgia-2026', name: 'Georgia 2026', destination: 'Tbilisi, Georgia',
    start_date: '2026-07-07', end_date: '2026-08-04', is_special: true,
    notes: 'Our first trip together. The big one.', created_by: A,
  });
  await ins('trip_items', [
    // Places with real coords + planned days (Jul 7–Aug 4) → show on the map.
    { trip_id: GEORGIA, kind: 'place', title: 'Old Town Tbilisi', description: 'Wander the cobbled streets', status: 'open', position: 0, day: '2026-07-08', lat: 41.6900, lng: 44.8080, created_by: A },
    { trip_id: GEORGIA, kind: 'place', title: 'Abanotubani sulphur baths', description: 'The domed bathhouses', status: 'open', position: 1, day: '2026-07-09', lat: 41.6877, lng: 44.8095, created_by: B },
    { trip_id: GEORGIA, kind: 'place', title: 'Mtskheta & Jvari', description: 'The old capital', status: 'open', position: 2, day: '2026-07-12', lat: 41.8417, lng: 44.7211, created_by: A },
    { trip_id: GEORGIA, kind: 'place', title: 'Gergeti Trinity, Kazbegi', description: 'The church under the peak', status: 'open', position: 3, day: '2026-07-18', lat: 42.6625, lng: 44.6203, created_by: B },
    { trip_id: GEORGIA, kind: 'place', title: 'Kakheti wine, Telavi', description: 'Qvevri tasting', status: 'open', position: 4, day: '2026-07-25', lat: 41.9170, lng: 45.4730, created_by: A },
    { trip_id: GEORGIA, kind: 'todo', title: 'Try khinkali', status: 'done', position: 5, created_by: A },
    // Wishlist (kind = wish).
    { trip_id: GEORGIA, kind: 'wish', title: 'A handmade Georgian rug', status: 'open', position: 6, created_by: B },
    { trip_id: GEORGIA, kind: 'wish', title: 'Churchkhela for the road', status: 'open', position: 7, created_by: A },
    { trip_id: GEORGIA, kind: 'wish', title: 'A bottle of saperavi', status: 'open', position: 8, created_by: B },
  ]);
  {
    const shots = [['Tbilisi rooftops', '🏘️'], ['Khachapuri feast', '🧀'], ['Caucasus peaks', '⛰️'], ['Wine toast', '🍷'], ['Old town night', '🌃'], ['Us, finally together', '❤️']];
    const rows = [];
    for (let i = 0; i < shots.length; i++) {
      const fileId = crypto.randomUUID(); const path = `${GEORGIA}/${fileId}.jpg`;
      await up('georgia-album', path, shots[i][0], shots[i][1], C.lapis, pick(i + 2));
      rows.push({ trip_id: GEORGIA, image_path: path, caption: shots[i][0], created_by: i % 2 ? B : A });
    }
    await ins('trip_photos', rows);
  }

  // ── Scavenger cards + claims (Georgia date-cards game) ──
  {
    const cards = [
      { title: 'Khachapuri kiss', description: 'Share an Adjarian khachapuri and kiss over it', points: 1, position: 0 },
      { title: 'Sulphur baths', description: 'Visit the Tbilisi sulphur baths together', points: 1, position: 1 },
      { title: 'Wine toast', description: 'Toast with Georgian wine and a heartfelt cheers', points: 2, position: 2 },
      { title: 'Mountain selfie', description: 'A selfie with the Caucasus behind you', points: 3, position: 3 },
      { title: 'Learn “gaumarjos”', description: 'Cheers in Georgian, said correctly', points: 1, position: 4 },
    ].map((c) => ({ id: crypto.randomUUID(), trip_id: GEORGIA, created_by: A, ...c }));
    await ins('scavenger_cards', cards);
    // a couple already claimed, with proof images
    const claims = [];
    for (let i = 0; i < 2; i++) {
      const path = `${cards[i].id}.jpg`;
      await up('scavenger-proof', path, cards[i].title, '📸', C.copper, C.wine);
      claims.push({ card_id: cards[i].id, claimed_by: i % 2 ? B : A, image_path: path, note: 'Done! 🎉' });
    }
    await ins('scavenger_claims', claims);
    await ins([
      { card_id: cards[2].id, user_id: A, body: 'We should do this one at sunset.' },
      { card_id: cards[2].id, user_id: B, body: 'Agreed, with the good wine.' },
    ]);
  }

  // ── Quizzes: keep qotd, add a "this-or-that" deck + responses ──
  {
    // qotd responses (both answer the 2 existing cards)
    const { data: qcards } = await sb.from('deck_cards').select('id, deck_id, position').eq('deck_id', '33333333-3333-3333-3333-333333333333').order('position');
    if (qcards?.length) {
      const rr = [];
      for (const c of qcards) {
        rr.push({ deck_id: c.deck_id, card_id: c.id, user_id: A, answer: { text: 'Our first call — I was so nervous.' } });
        rr.push({ deck_id: c.deck_id, card_id: c.id, user_id: B, answer: { text: 'The day you said you’d visit.' } });
      }
      await ins('deck_responses', rr);
    }
    // new this-or-that deck
    const did = crypto.randomUUID();
    const exists = await sb.from('decks').select('id').eq('slug', 'this-or-that').maybeSingle();
    if (!exists.data) {
      await ins('decks', [{ id: did, slug: 'this-or-that', kind: 'this-or-that', mode: 'compare', title: 'This or That', description: 'Tap your pick, then see if you match.', created_by: B }]);
      await ins('deck_cards', [
        { deck_id: did, position: 0, prompt: { text: 'Beach or mountains?' } },
        { deck_id: did, position: 1, prompt: { text: 'Morning person or night owl?' } },
        { deck_id: did, position: 2, prompt: { text: 'Sweet or savory?' } },
        { deck_id: did, position: 3, prompt: { text: 'Call or text?' } },
      ]);
    }
  }

  // ── Know Me: seed past days fully answered (History + reveal) ──
  {
    const { data: qs } = await sb.from('know_me_questions').select('id, options').order('created_at').limit(6);
    if (qs?.length) {
      for (let i = 1; i <= 4; i++) {
        const q = qs[i % qs.length];
        const opts = q.options.map((o) => o.id);
        const dayId = crypto.randomUUID();
        const { error } = await sb.from('know_me_days').insert({ id: dayId, couple_day: dstr(-i), question_id: q.id });
        if (error) { console.warn('  know_me_days:', error.message); continue; }
        const rA = opts[Math.floor(Math.random() * 4)], rB = opts[Math.floor(Math.random() * 4)];
        await sb.from('know_me_answers').insert([
          { day_id: dayId, user_id: A, own_choice: rA, guess_choice: rB },
          { day_id: dayId, user_id: B, own_choice: rB, guess_choice: rA },
        ]);
        await sb.from('know_me_presence').insert([
          { day_id: dayId, user_id: A }, { day_id: dayId, user_id: B },
        ]);
      }
      console.log('  ✓ know_me past days (4)');
    }
  }

  // ── Know Me: tonight's THREE open questions (slots 0,1,2), unanswered ──
  {
    const { data: qs } = await sb
      .from('know_me_questions')
      .select('id')
      .order('created_at')
      .limit(3);
    if (qs?.length === 3) {
      const day = dstr(0);
      const rows = qs.map((q, slot) => ({
        couple_day: day,
        slot,
        question_id: q.id,
      }));
      const { error } = await sb
        .from('know_me_days')
        .upsert(rows, { onConflict: 'couple_day,slot' });
      if (error) console.warn('  know_me today:', error.message);
      else console.log('  ✓ know_me tonight (3 questions)');
    }
  }


  console.log('\nDONE. Seeded every feature with demo data + images.');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
