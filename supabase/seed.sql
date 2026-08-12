-- ════════════════════════════════════════════════════════════════════════
-- Katitos — local seed (runs after migrations on `supabase db reset`/start).
-- Creates the two members and light sample data so every feature has content.
-- NOTE: seed runs as `postgres` (auth.uid() is null here), so created_by/owner
-- columns are set EXPLICITLY below.
-- ════════════════════════════════════════════════════════════════════════

-- Fixed ids for the two members.
-- A = Vicente, B = Anastasia.
-- 11111111… / 22222222…

-- ── Auth users ──
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'vicente@katitos.local', crypt('katitos123', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Vicente"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'anastasia@katitos.local', crypt('katitos123', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Anastasia"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

-- ── Auth identities (required for email/password sign-in) ──
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values
  (
    gen_random_uuid(), 'vicente@katitos.local',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"vicente@katitos.local","email_verified":true}',
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(), 'anastasia@katitos.local',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"anastasia@katitos.local","email_verified":true}',
    'email', now(), now(), now()
  )
on conflict do nothing;

-- ── The couple + members ──
insert into public.couple (id, relationship_start_date, anniversary_day)
values (true, date '2025-06-15', 15)
on conflict (id) do nothing;

insert into public.couple_members (
  user_id, display_name, role, emoji, city, country, lat, lng, timezone,
  native_language, learning_language
)
values
  (
    '11111111-1111-1111-1111-111111111111', 'Vicente', 'a', '🧉',
    'Curicó', 'Chile', -34.9828, -71.2394, 'America/Santiago', 'es', 'ru'
  ),
  (
    '22222222-2222-2222-2222-222222222222', 'Anastasia', 'b', '🌸',
    'Novosibirsk', 'Russia', 55.0084, 82.9357, 'Asia/Novosibirsk', 'ru', 'es'
  )
on conflict (user_id) do nothing;

-- A recent last-seen so the offline state reads "last here 2 hours ago"
-- (rather than a bare "offline") before live presence kicks in.
update public.couple_members set last_seen_at = now() - interval '2 hours';

-- ── Currency rates ──
insert into public.currency_rates (base, quote, rate)
values
  ('USD', 'CLP', 950), ('CLP', 'USD', 0.001053),
  ('USD', 'RUB', 90), ('RUB', 'USD', 0.01111),
  ('RUB', 'CLP', 10.55), ('CLP', 'RUB', 0.0948)
on conflict (base, quote) do nothing;

-- ── Sample feature data ──
insert into public.countdowns (title, target_at, emoji, created_by)
values
  ('Georgia trip ✈️', timestamptz '2026-07-10 00:00:00+00', '✈️',
   '11111111-1111-1111-1111-111111111111'),
  ('Next reunion', timestamptz '2026-12-20 00:00:00+00', '❤️',
   '22222222-2222-2222-2222-222222222222');

insert into public.cute_words (term, meaning, coined_by)
values
  ('katito', 'our pet name for each other', '11111111-1111-1111-1111-111111111111'),
  ('pololo', 'boyfriend (Chilean slang)', '11111111-1111-1111-1111-111111111111'),
  ('maieie', 'an untranslatable cute sound', '22222222-2222-2222-2222-222222222222');

insert into public.decisions (id, topic, description, status, created_by)
values (
  '66666666-6666-6666-6666-666666666666', 'Number of kids',
  'How many kids do we want?', 'open',
  '11111111-1111-1111-1111-111111111111'
);
insert into public.decision_positions (decision_id, user_id, position, note)
values
  ('66666666-6666-6666-6666-666666666666',
   '11111111-1111-1111-1111-111111111111', '15', 'more is more 😎'),
  ('66666666-6666-6666-6666-666666666666',
   '22222222-2222-2222-2222-222222222222', '3.5', 'be reasonable!');

insert into public.finance_goals (id, title, target_amount, currency, target_date, created_by)
values (
  '77777777-7777-7777-7777-777777777777', 'Visit to Russia', 2000, 'USD',
  date '2026-12-01', '11111111-1111-1111-1111-111111111111'
);
insert into public.finance_contributions (goal_id, user_id, amount, note)
values (
  '77777777-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111', 300, 'first savings'
);

insert into public.ideas (title, description, category, created_by)
values (
  'Watch the sunrise on a video call', 'set alarms across timezones', 'ritual',
  '11111111-1111-1111-1111-111111111111'
);

insert into public.punitos (title, description, level, status, proposed_by)
values (
  'Always say goodnight', 'No matter the fight, we say goodnight.', 'serious',
  'sealed', '22222222-2222-2222-2222-222222222222'
);

-- Question-of-the-day deck (compare mode).
insert into public.decks (id, slug, kind, mode, title, description, created_by)
values (
  '33333333-3333-3333-3333-333333333333', 'qotd', 'qotd', 'compare',
  'Question of the Day', 'One question, both answer, then reveal.',
  '11111111-1111-1111-1111-111111111111'
);
insert into public.deck_cards (deck_id, position, prompt)
values
  ('33333333-3333-3333-3333-333333333333', 0,
   '{"text":"What is your favorite memory of us so far?"}'),
  ('33333333-3333-3333-3333-333333333333', 1,
   '{"text":"Where should we travel after Georgia?"}');

-- Movies wishlist.
insert into public.wishlists (id, title, category, created_by)
values (
  '44444444-4444-4444-4444-444444444444', 'Movies to watch', 'movies',
  '11111111-1111-1111-1111-111111111111'
);
insert into public.wishlist_items (list_id, title, added_by)
values
  ('44444444-4444-4444-4444-444444444444', 'Amélie',
   '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444', 'Brokeback Mountain',
   '22222222-2222-2222-2222-222222222222'),
  ('44444444-4444-4444-4444-444444444444', 'Past Lives',
   '22222222-2222-2222-2222-222222222222');

-- Georgia 2026 trip + scavenger cards.
insert into public.trips (id, slug, name, destination, start_date, end_date, is_special, created_by)
values (
  '55555555-5555-5555-5555-555555555555', 'georgia-2026', 'Georgia 2026',
  'Tbilisi, Georgia', date '2026-07-07', date '2026-08-04', true,
  '11111111-1111-1111-1111-111111111111'
);
insert into public.scavenger_cards (trip_id, title, description, points, position, created_by)
values
  ('55555555-5555-5555-5555-555555555555', 'Khachapuri kiss',
   'Share an Adjarian khachapuri and kiss over it', 1, 0,
   '11111111-1111-1111-1111-111111111111'),
  ('55555555-5555-5555-5555-555555555555', 'Sulphur baths',
   'Visit the Tbilisi sulphur baths together', 1, 1,
   '11111111-1111-1111-1111-111111111111'),
  ('55555555-5555-5555-5555-555555555555', 'Wine toast',
   'Toast with Georgian wine and a heartfelt cheers', 2, 2,
   '22222222-2222-2222-2222-222222222222');

-- Language decks + phrases.
-- Phrases MUST belong to a deck: every screen filters by deck_id, so a phrase
-- with a null deck is invisible the moment it is created.
insert into public.language_decks (id, language, title, emoji, description, created_by)
values
  ('dddddddd-0000-0000-0000-000000000001', 'ru', 'Sweet nothings', '🤍',
   'The words I want you to know by heart', '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0000-0000-0000-000000000002', 'es', 'Lo básico', '🧉',
   'Para que me entiendas en Curicó', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.phrases (deck_id, language, text, translation, transliteration, example, added_by)
values
  ('dddddddd-0000-0000-0000-000000000001', 'ru', 'Я тебя люблю', 'I love you', 'Ya tebya lyublyu', 'Я тебя люблю, котёнок',
   '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0000-0000-0000-000000000001', 'ru', 'Спасибо большое', 'Thank you very much', 'Spasibo bolshoye', null,
   '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0000-0000-0000-000000000001', 'ru', 'Доброе утро', 'Good morning', 'Dobroye utro', null,
   '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0000-0000-0000-000000000001', 'ru', 'Скучаю по тебе', 'I miss you', 'Skuchayu po tebe', null,
   '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0000-0000-0000-000000000002', 'es', 'Te amo', 'I love you', null, 'Te amo, mi vida',
   '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-0000-0000-0000-000000000002', 'es', 'Buenos días', 'Good morning', null, null,
   '11111111-1111-1111-1111-111111111111');

-- ── The wall (chalkboard notes) ──
insert into public.chalkboard_notes (body, color, x, y, rotation, author)
values
  ('te amo 🤍', '#f4ece0', 18, 26, -5, '11111111-1111-1111-1111-111111111111'),
  ('приезжай скорее ✈️', '#e8a9b8', 150, 150, 4, '22222222-2222-2222-2222-222222222222'),
  ('mate this weekend?', '#cdd6b4', 30, 300, -3, '11111111-1111-1111-1111-111111111111');

-- ── Georgia itinerary ──
insert into public.trip_items (trip_id, kind, title, status, position, created_by)
values
  ('55555555-5555-5555-5555-555555555555', 'place', 'Wander Tbilisi old town', 'open', 0, '11111111-1111-1111-1111-111111111111'),
  ('55555555-5555-5555-5555-555555555555', 'todo', 'Book the sulphur baths', 'done', 1, '11111111-1111-1111-1111-111111111111'),
  ('55555555-5555-5555-5555-555555555555', 'idea', 'Wine tasting in Kakheti', 'open', 2, '22222222-2222-2222-2222-222222222222'),
  ('55555555-5555-5555-5555-555555555555', 'place', 'Kazbegi day trip', 'open', 3, '11111111-1111-1111-1111-111111111111');

-- ── Tonight's three Know-Me questions (slots 0,1,2 for the current couple-day) ──
-- Picks three distinct active questions; idempotent on (couple_day, slot).
do $$
declare
  v_date date := current_date;
  v_ids uuid[];
begin
  select array_agg(id) into v_ids from (
    select id from public.know_me_questions where active order by created_at limit 3
  ) q;
  if v_ids is not null and array_length(v_ids, 1) = 3 then
    insert into public.know_me_days (couple_day, slot, question_id)
    values
      (v_date, 0, v_ids[1]),
      (v_date, 1, v_ids[2]),
      (v_date, 2, v_ids[3])
    on conflict (couple_day, slot) do nothing;
  end if;
end $$;
