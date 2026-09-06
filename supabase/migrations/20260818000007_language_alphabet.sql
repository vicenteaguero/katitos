-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the Russian alphabet, all thirty-three of it
--
--   You cannot start Russian anywhere else. The letters are SEEDED HERE, in
--   the migration, and not in seed.sql: seed.sql only ever runs on a local
--   reset, so anything that lives there looks deleted on the real app.
--
--   Sounds are recorded in-app afterwards, one letter at a time, in her voice.
--   That is the point of it - a recording of a stranger saying Ы is worth much
--   less than a recording of her saying it.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.lang_alphabet (
  id uuid primary key default gen_random_uuid(),
  script text not null default 'cyrillic',
  letter text not null,
  lower text not null,
  name_en text,
  name_es text,
  sound_hint_en text,
  sound_hint_es text,
  example_word text,
  example_translation_en text,
  example_translation_es text,
  audio_path text,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  unique (script, letter)
);
create index if not exists lang_alphabet_order_idx
  on public.lang_alphabet (script, position);

insert into public.lang_alphabet
  (letter, lower, name_en, name_es, sound_hint_en, sound_hint_es,
   example_word, example_translation_en, example_translation_es, position)
values
  ('А','а','a','a','like "a" in father','como la "a" de casa','мама','mum','mamá',1),
  ('Б','б','be','be','like "b" in bed','como la "b" de barco','брат','brother','hermano',2),
  ('В','в','ve','ve','like "v" in van','como la "v" inglesa de van','вода','water','agua',3),
  ('Г','г','ge','gue','like "g" in go','como la "g" de gato','город','city','ciudad',4),
  ('Д','д','de','de','like "d" in door','como la "d" de dedo','дом','house','casa',5),
  ('Е','е','ye','ie','like "ye" in yes','como "ie" en siete','нет','no','no',6),
  ('Ё','ё','yo','io','like "yo" in yonder','como "io" en avión','ёлка','fir tree','abeto',7),
  ('Ж','ж','zhe','zhe','like "s" in pleasure','como la "j" francesa de jour','жена','wife','esposa',8),
  ('З','з','ze','ze','like "z" in zoo','como la "s" sonora de mismo','зима','winter','invierno',9),
  ('И','и','i','i','like "ee" in see','como la "i" de vino','имя','name','nombre',10),
  ('Й','й','i kratkoye','i corta','like "y" in boy','como la "y" de hoy','май','May','mayo',11),
  ('К','к','ka','ka','like "k" in kite','como la "c" de casa','кот','cat','gato',12),
  ('Л','л','el','ele','dark, like the "l" in full','una "l" gruesa, con la lengua atrás (como full en inglés)','луна','moon','luna',13),
  ('М','м','em','eme','like "m" in map','como la "m" de mano','море','sea','mar',14),
  ('Н','н','en','ene','like "n" in note','como la "n" de nube','ночь','night','noche',15),
  ('О','о','o','o','like "o" in more - when it is stressed','como la "o" de sol, cuando lleva el acento','он','he','él',16),
  ('П','п','pe','pe','like "p" in pen','como la "p" de pan','папа','dad','papá',17),
  ('Р','р','er','erre','rolled, like Spanish "r"','la "r" vibrante de perro','рука','hand','mano',18),
  ('С','с','es','ese','like "s" in sun','como la "s" de sol','сад','garden','jardín',19),
  ('Т','т','te','te','like "t" in top','como la "t" de tela','тепло','warm','cálido',20),
  ('У','у','u','u','like "oo" in boot','como la "u" de luna','утро','morning','mañana',21),
  ('Ф','ф','ef','efe','like "f" in fun','como la "f" de foco','фото','photo','foto',22),
  ('Х','х','kha','ja','like "ch" in loch','como la "j" de jamón','хорошо','good, well','bien',23),
  ('Ц','ц','tse','tse','like "ts" in cats','como "ts" en tsé-tsé','цветок','flower','flor',24),
  ('Ч','ч','che','che','like "ch" in chair','como la "ch" de coche','чай','tea','té',25),
  ('Ш','ш','sha','sha','like "sh" in shoe','como "sh" en show','шапка','hat','gorro',26),
  ('Щ','щ','shcha','shcha','a longer, softer "sh"','una "sh" más larga y suave','щенок','puppy','cachorro',27),
  ('Ъ','ъ','hard sign','signo duro','silent - it separates','muda - separa','подъезд','the entrance of a building','el portal',28),
  ('Ы','ы','y','y','a deep "i", further back','una "i" más atrás, con la lengua retraída','ты','you','tú',29),
  ('Ь','ь','soft sign','signo blando','silent - it softens','muda - suaviza','любовь','love','amor',30),
  ('Э','э','e','e','like "e" in met','como la "e" de mesa','этот','this','este',31),
  ('Ю','ю','yu','iu','like "u" in use','como "iu" en ciudad','юг','south','sur',32),
  ('Я','я','ya','ia','like "ya" in yard','como "ia" en piano','я','I','yo',33)
on conflict (script, letter) do nothing;

alter table public.lang_alphabet enable row level security;
drop policy if exists members_all on public.lang_alphabet;
create policy members_all on public.lang_alphabet for all
  using (public.is_member()) with check (public.is_member());
alter table public.lang_alphabet replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'lang_alphabet'
  ) then
    alter publication supabase_realtime add table public.lang_alphabet;
  end if;
end $$;

drop trigger if exists lang_alphabet_updated_at on public.lang_alphabet;
create trigger lang_alphabet_updated_at before update on public.lang_alphabet
  for each row execute function public.set_updated_at();
