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
  const { error } = await sb.storage.from(bucket).upload(path, svg(label, emoji, c1, c2), {
    contentType: 'image/svg+xml', upsert: true,
  });
  if (error) console.warn(`  upload ${bucket}/${path}: ${error.message}`);
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
    'date_photos', 'date_ratings', 'dates', 'baby_name_votes', 'baby_names',
    'finance_contributions', 'finance_goals', 'wishlist_votes', 'wishlist_items', 'wishlists',
    'decision_positions', 'decisions', 'trip_photos', 'trip_items',
    'scavenger_arguments', 'scavenger_claims', 'scavenger_cards',
    'album_stickers', 'know_me_answers', 'know_me_presence', 'know_me_days',
    'polaroids', 'flowers', 'fights', 'punitos', 'cute_words', 'ideas', 'countdowns',
    'chalkboard_notes', 'phrases', 'deck_responses', 'game_scores', 'app_opens',
    'tree_waterings', 'tree_milestones',
  ]) await wipe(t);

  // ── Countdowns ──
  await ins('countdowns', [
    { title: 'Georgia trip ✈️', target_at: tstr(29), emoji: '✈️', created_by: A },
    { title: 'Our anniversary 💍', target_at: tstr(65), emoji: '💍', created_by: B },
    { title: "Anastasia's birthday 🎂", target_at: tstr(12), emoji: '🎂', created_by: A },
    { title: 'Next reunion ❤️', target_at: tstr(96), emoji: '❤️', created_by: B },
    { title: 'Visa appointment', target_at: tstr(5), emoji: '🛂', created_by: A },
  ]);

  // ── Cute words ──
  await ins('cute_words', [
    { term: 'katito', meaning: 'our pet name for each other', example: 'buenas noches, katito', coined_by: A },
    { term: 'pololo', meaning: 'boyfriend (Chilean slang)', coined_by: A },
    { term: 'maieie', meaning: 'an untranslatable cute sound', coined_by: B },
    { term: 'zaika', meaning: 'little bunny (зайка)', example: 'spokoynoy nochi, zaika', coined_by: B },
    { term: 'mi vida', meaning: 'my life', coined_by: A },
    { term: 'solnyshko', meaning: 'little sun (солнышко)', coined_by: B },
  ]);

  // ── Ideas ──
  await ins('ideas', [
    { title: 'Watch the sunrise on a video call', description: 'set alarms across timezones', category: 'ritual', status: 'idea', created_by: A },
    { title: 'Cook each other’s national dish', description: 'pastel de choclo vs. borscht', category: 'food', status: 'planned', created_by: B },
    { title: 'Read the same book together', description: 'one chapter a night', category: 'ritual', status: 'done', created_by: A },
    { title: 'Learn a song in both languages', category: 'music', status: 'idea', created_by: B },
    { title: 'Plan the Georgia itinerary', category: 'travel', status: 'planned', created_by: A },
  ]);

  // ── Punitos ──
  await ins('punitos', [
    { title: 'Always say goodnight', description: 'No matter the fight, we say goodnight.', level: 'serious', status: 'sealed', proposed_by: B, sealed_at: tstr(-40) },
    { title: 'Loser cooks next call', description: 'Whoever loses the game cooks on camera.', level: 'soft', status: 'proposed', proposed_by: A },
    { title: 'No phones at dinner', description: 'Even on video.', level: 'soft', status: 'broken', proposed_by: A, sealed_at: tstr(-20) },
  ]);

  // ── Fights (fight-timer) ──
  await ins('fights', [
    { reason: 'Misunderstanding over a text', started_at: tstr(-9), started_by: A, resolution: 'Talked it out on a long call. All good. ❤️' },
    { reason: 'Timezone mix-up for a call', started_at: tstr(-2), started_by: B, resolution: null },
  ]);

  // ── Phrases (language) ──
  await ins('phrases', [
    { language: 'ru', text: 'Я тебя люблю', translation: 'I love you', transliteration: 'Ya tebya lyublyu', category: 'love', added_by: B },
    { language: 'es', text: 'Te amo', translation: 'I love you', category: 'love', added_by: A },
    { language: 'ru', text: 'Доброе утро', translation: 'Good morning', transliteration: 'Dobroye utro', category: 'daily', added_by: B },
    { language: 'es', text: 'Buenos días', translation: 'Good morning', category: 'daily', added_by: A },
    { language: 'ru', text: 'Скучаю по тебе', translation: 'I miss you', transliteration: 'Skuchayu po tebe', category: 'love', added_by: B },
    { language: 'es', text: '¿Cómo amaneciste?', translation: 'How did you wake up?', category: 'daily', added_by: A },
    { language: 'ru', text: 'Спокойной ночи', translation: 'Good night', transliteration: 'Spokoynoy nochi', category: 'daily', added_by: B },
  ]);

  // ── Baby names + votes ──
  {
    const names = [
      { name: 'Mateo', gender: 'boy', meaning: 'Gift of God', origin: 'Spanish' },
      { name: 'Sofía', gender: 'girl', meaning: 'Wisdom', origin: 'Greek/Russian' },
      { name: 'Nikolái', gender: 'boy', meaning: 'Victory of the people', origin: 'Russian' },
      { name: 'Valentina', gender: 'girl', meaning: 'Strong, healthy', origin: 'Latin' },
      { name: 'Tomás', gender: 'boy', meaning: 'Twin', origin: 'Spanish' },
      { name: 'Mila', gender: 'girl', meaning: 'Dear, gracious', origin: 'Slavic' },
    ].map((n) => ({ id: crypto.randomUUID(), proposed_by: Math.random() > 0.5 ? A : B, ...n }));
    await ins('baby_names', names);
    const votes = [];
    for (const n of names) { votes.push({ name_id: n.id, user_id: A, vote: Math.random() > 0.3 ? 1 : -1 }); votes.push({ name_id: n.id, user_id: B, vote: Math.random() > 0.3 ? 1 : -1 }); }
    await ins('baby_name_votes', votes);
  }

  // ── Finance ──
  {
    const g1 = crypto.randomUUID(), g2 = crypto.randomUUID();
    await ins('finance_goals', [
      { id: g1, title: 'Visit to Russia', target_amount: 2000, currency: 'USD', target_date: dstr(180), created_by: A },
      { id: g2, title: 'Our first apartment', target_amount: 8000, currency: 'USD', target_date: dstr(540), created_by: B },
    ]);
    await ins('finance_contributions', [
      { goal_id: g1, user_id: A, amount: 300, note: 'first savings' },
      { goal_id: g1, user_id: B, amount: 250, note: 'from my side' },
      { goal_id: g1, user_id: A, amount: 180, note: 'sold some stuff' },
      { goal_id: g2, user_id: B, amount: 500, note: 'apartment fund start' },
      { goal_id: g2, user_id: A, amount: 420 },
    ]);
  }

  // ── Decisions ──
  {
    const d1 = crypto.randomUUID(), d2 = crypto.randomUUID();
    await ins('decisions', [
      { id: d1, topic: 'Number of kids', description: 'How many kids do we want?', status: 'open', created_by: A },
      { id: d2, topic: 'Where to live first', description: 'Whose country do we start in?', status: 'agreed', agreed_value: 'A neutral third country for a year', created_by: B },
    ]);
    await ins('decision_positions', [
      { decision_id: d1, user_id: A, position: '15', note: 'more is more 😎' },
      { decision_id: d1, user_id: B, position: '3.5', note: 'be reasonable!' },
      { decision_id: d2, user_id: A, position: 'Chile', note: 'sunshine' },
      { decision_id: d2, user_id: B, position: 'Russia', note: 'family is here' },
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

  // ── Chalkboard / Fridge wall ──
  {
    const colors = [C.cream, '#FFFAFA', C.gold, C.copper];
    const notes = [
      'Te amo, mi vida ❤️', 'Доброе утро, solnyshko ☀️', 'only 29 days ✈️',
      'you make me brave', 'call me when you wake up', 'я скучаю по тебе',
      'we are inevitable', 'pastel de choclo soon 🌽',
    ].map((body, i) => ({
      body, color: colors[i % colors.length],
      x: (i % 3) * 150 + 20 + Math.random() * 30, y: Math.floor(i / 3) * 140 + 20 + Math.random() * 20,
      rotation: Math.random() * 10 - 5, author: i % 2 ? B : A,
    }));
    await ins('chalkboard_notes', notes);
  }

  // ── Game scores (leaderboard) ──
  {
    const rows = [];
    for (let i = 0; i < 7; i++) rows.push({ game_id: 'reaction', user_id: i % 2 ? A : B, score: 220 + Math.floor(Math.random() * 260), created_at: tstr(-i) });
    for (let i = 0; i < 7; i++) rows.push({ game_id: 'memory-match', user_id: i % 2 ? B : A, score: 12 + Math.floor(Math.random() * 22), created_at: tstr(-i) });
    await ins('game_scores', rows);
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
      ['Morning coffee, two cities', '☕'], ['Sunset on a call', '🌇'], ['Her in Moscow snow', '❄️'],
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
    start_date: dstr(29), is_special: true, notes: 'Our first trip together. The big one.', created_by: A,
  });
  await ins('trip_items', [
    { trip_id: GEORGIA, kind: 'place', title: 'Old Town Tbilisi', description: 'Wander the cobbled streets', status: 'open', position: 0, created_by: A },
    { trip_id: GEORGIA, kind: 'place', title: 'Kazbegi & the Caucasus', description: 'Gergeti Trinity Church', status: 'open', position: 1, created_by: B },
    { trip_id: GEORGIA, kind: 'todo', title: 'Try khinkali', status: 'open', position: 2, created_by: A },
    { trip_id: GEORGIA, kind: 'todo', title: 'Sulphur baths', status: 'open', position: 3, created_by: B },
    { trip_id: GEORGIA, kind: 'idea', title: 'Wine region day trip', description: 'Kakheti', status: 'open', position: 4, created_by: A },
    { trip_id: GEORGIA, kind: 'note', title: 'Pack warm layers for the mountains', status: 'done', position: 5, created_by: B },
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
    await ins('scavenger_arguments', [
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

  // ── Album: fill ~28 slots with stickers (images) across chapters ──
  {
    const { data: slots } = await sb.from('album_slots')
      .select('id, chapter_id, title, is_duo, position, album_chapters!inner(position)')
      .order('position', { foreignTable: 'album_chapters' })
      .order('position')
      .limit(30);
    if (slots?.length) {
      const rows = [];
      const emojis = ['📸', '💌', '📞', '✈️', '🍳', '🎁', '🤝', '👨‍👩‍👧', '🤳', '🌹', '🎂', '🌅', '🏖️', '🎄', '💍'];
      let n = 0;
      for (const s of slots) {
        const halves = s.is_duo ? ['a', 'b'] : ['solo'];
        for (const half of halves) {
          const path = `${s.chapter_id}/${s.id}-${half}.jpg`;
          await up('album', path, s.title, emojis[n % emojis.length], pick(n), pick(n + 4));
          rows.push({ slot_id: s.id, half, image_path: path, caption: s.title,
            taken_on: dstr(-(n * 9)), created_by: half === 'b' ? B : A });
          n++;
        }
        if (n >= 34) break;
      }
      await ins('album_stickers', rows);
    }
  }

  console.log('\nDONE. Seeded every feature with demo data + images.');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
