-- Add Georgian (ka) + Turkish (tr) to the language feature, and seed travel
-- phrase decks (prod has no seed.sql, so the content ships as a migration).

alter table public.phrases drop constraint if exists phrases_language_check;
alter table public.phrases
  add constraint phrases_language_check
  check (language in ('ru', 'es', 'ka', 'tr'));

alter table public.language_decks
  drop constraint if exists language_decks_language_check;
alter table public.language_decks
  add constraint language_decks_language_check
  check (language in ('ru', 'es', 'ka', 'tr'));

-- Idempotent travel decks + phrases. text = the foreign phrase (card front),
-- translation = English, transliteration = how it sounds.
do $$
declare
  v_creator uuid;
  v_deck uuid;
begin
  select user_id into v_creator
  from public.couple_members order by role limit 1;
  if v_creator is null then return; end if;

  -- ── Türkiye ────────────────────────────────────────────────────────────
  if not exists (
    select 1 from public.language_decks
    where language = 'tr' and title = 'Türkiye — travel basics'
  ) then
    insert into public.language_decks (language, title, description, emoji, created_by)
    values ('tr', 'Türkiye — travel basics', 'The essentials for our days in Türkiye', '🇹🇷', v_creator)
    returning id into v_deck;
    insert into public.phrases (deck_id, language, text, translation, transliteration, category, added_by) values
      (v_deck, 'tr', 'Merhaba', 'Hello', 'mer-ha-BA', 'travel', v_creator),
      (v_deck, 'tr', 'İyi günler', 'Good day (polite hello)', 'ee-YEE gewn-LER', 'travel', v_creator),
      (v_deck, 'tr', 'Nasılsın?', 'How are you?', 'NA-suhl-suhn', 'travel', v_creator),
      (v_deck, 'tr', 'Hoşça kal', 'Goodbye (to the one staying)', 'HOSH-cha kal', 'travel', v_creator),
      (v_deck, 'tr', 'Güle güle', 'Goodbye (to the one leaving)', 'gew-LE gew-LE', 'travel', v_creator),
      (v_deck, 'tr', 'Teşekkür ederim', 'Thank you', 'te-shek-KEWR e-de-RIM', 'travel', v_creator),
      (v_deck, 'tr', 'Lütfen', 'Please', 'LEWT-fen', 'travel', v_creator),
      (v_deck, 'tr', 'Affedersiniz', 'Excuse me (to pass / get attention)', 'af-fe-der-see-NEEZ', 'travel', v_creator),
      (v_deck, 'tr', 'Evet', 'Yes', 'e-VET', 'travel', v_creator),
      (v_deck, 'tr', 'Hayır', 'No', 'ha-YUHR', 'travel', v_creator),
      (v_deck, 'tr', 'Ne kadar?', 'How much is it?', 'ne ka-DAR', 'travel', v_creator),
      (v_deck, 'tr', 'Hesap, lütfen', 'The bill, please', 'he-SAP LEWT-fen', 'travel', v_creator),
      (v_deck, 'tr', 'Su', 'Water', 'soo', 'travel', v_creator),
      (v_deck, 'tr', 'Çok güzel', 'Very nice', 'chok gew-ZEL', 'travel', v_creator);
  end if;

  -- ── Georgia ────────────────────────────────────────────────────────────
  if not exists (
    select 1 from public.language_decks
    where language = 'ka' and title = 'Georgia — travel basics'
  ) then
    insert into public.language_decks (language, title, description, emoji, created_by)
    values ('ka', 'Georgia — travel basics', 'The essentials for our days in Georgia', '🇬🇪', v_creator)
    returning id into v_deck;
    insert into public.phrases (deck_id, language, text, translation, transliteration, category, added_by) values
      (v_deck, 'ka', 'გამარჯობა', 'Hello', 'ga-mar-JO-ba', 'travel', v_creator),
      (v_deck, 'ka', 'გამარჯობათ', 'Hello (polite)', 'ga-mar-jo-BAT', 'travel', v_creator),
      (v_deck, 'ka', 'როგორ ხარ?', 'How are you?', 'RO-gor khar', 'travel', v_creator),
      (v_deck, 'ka', 'ნახვამდის', 'Goodbye', 'nakh-VAM-dis', 'travel', v_creator),
      (v_deck, 'ka', 'მადლობა', 'Thank you', 'MA-dlo-ba', 'travel', v_creator),
      (v_deck, 'ka', 'დიდი მადლობა', 'Thank you very much', 'DI-di MA-dlo-ba', 'travel', v_creator),
      (v_deck, 'ka', 'გთხოვთ', 'Please', 'g-TKHOVT', 'travel', v_creator),
      (v_deck, 'ka', 'უკაცრავად', 'Excuse me', 'u-ka-TSRA-vad', 'travel', v_creator),
      (v_deck, 'ka', 'ნება მომეცით', 'Excuse me (let me pass)', 'NE-ba mo-ME-tsit', 'travel', v_creator),
      (v_deck, 'ka', 'დიახ', 'Yes', 'DI-akh', 'travel', v_creator),
      (v_deck, 'ka', 'არა', 'No', 'A-ra', 'travel', v_creator),
      (v_deck, 'ka', 'რა ღირს?', 'How much is it?', 'ra GHIRS', 'travel', v_creator),
      (v_deck, 'ka', 'წყალი', 'Water', 'ts-KA-li', 'travel', v_creator),
      (v_deck, 'ka', 'გაუმარჯოს', 'Cheers', 'gau-MAR-jos', 'travel', v_creator);
  end if;
end $$;
