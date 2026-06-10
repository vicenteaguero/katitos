-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Pololini Album catalog (immutable shared content)
-- 12 chapters + ~150 starter slots. Chapters have fixed UUIDs; slots use
-- gen_random_uuid() + on conflict (chapter_id, position) do nothing, so this is
-- idempotent. created_by defaults to NULL here (catalog is couple-agnostic).
-- INVARIANT: catalog positions < 1000; couple-authored custom slots use >= 1000.
-- Time-gates only on universal dates (New Year); seasonal slots ship ungated.
-- ════════════════════════════════════════════════════════════════════════

insert into public.album_chapters (id, position, slug, title, subtitle, emoji) values
  ('c1000000-0000-0000-0000-000000000001', 1, 'firsts', 'Firsts', 'Where it all began', '✨'),
  ('c1000000-0000-0000-0000-000000000002', 2, 'mundane-beautiful', 'The Mundane Beautiful', 'Ordinary days, together', '☕'),
  ('c1000000-0000-0000-0000-000000000003', 3, 'adventures', 'Adventures', 'Out in the world', '🧭'),
  ('c1000000-0000-0000-0000-000000000004', 4, 'milestones', 'Milestones', 'The big ones', '🏆'),
  ('c1000000-0000-0000-0000-000000000005', 5, 'seasons-holidays', 'Seasons & Holidays', 'Times of the year', '🎄'),
  ('c1000000-0000-0000-0000-000000000006', 6, 'faces-places', 'Faces & Places', 'You, and where you are', '📍'),
  ('c1000000-0000-0000-0000-000000000007', 7, 'someday-done', 'Someday → Done', 'Dreams we made real', '🌠'),
  ('c1000000-0000-0000-0000-000000000008', 8, 'tastes', 'Tastes', 'Everything we ate', '🍜'),
  ('c1000000-0000-0000-0000-000000000009', 9, 'rituals', 'Little Rituals', 'The things we always do', '🔁'),
  ('c1000000-0000-0000-0000-00000000000a', 10, 'growth', 'Growth', 'How we became us', '🌱'),
  ('c1000000-0000-0000-0000-00000000000b', 11, 'dreams', 'Dreams', 'The life we''re building', '💭'),
  ('c1000000-0000-0000-0000-00000000000c', 12, 'numbers', 'Us in Numbers', 'The receipts', '🔢')
on conflict (id) do nothing;

-- Helper note: each block inserts a chapter's slots from a VALUES list.
-- Columns: position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'Our first photo together','The very first one','foil',false,null::smallint,null::smallint,null::text),
  (1,'First "I love you"','A screenshot counts','foil',false,null,null,null),
  (2,'Our first call','Or a photo of the screen','rare',false,null,null,null),
  (3,'First trip together','Anywhere','rare',false,null,null,null),
  (4,'First time cooking together','The result (or the mess)','common',false,null,null,null),
  (5,'First gift','What you gave or got','common',false,null,null,null),
  (6,'First fight, then made up','Proof you survived it','rare',false,null,null,null),
  (7,'First time meeting the family','Nervous smiles','rare',false,null,null,null),
  (8,'First selfie','You two, one frame','common',false,null,null,null),
  (9,'First place we called "ours"','A spot, a couch, a city','common',false,null,null,null),
  (10,'First inside joke','Capture the thing','common',false,null,null,null),
  (11,'First sunrise/sunset together','Same one, or apart','rare',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'firsts'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'Morning coffee','However you take it','common',false,null::smallint,null::smallint,null::text),
  (1,'A boring Tuesday','Nothing special, on purpose','common',false,null,null,null),
  (2,'Doing the dishes','Glamorous','common',false,null,null,null),
  (3,'Falling asleep on a call','The drooping eyes','common',false,null,null,null),
  (4,'Your messy desk','Real life','common',false,null,null,null),
  (5,'Grocery run','The haul or the aisle','common',false,null,null,null),
  (6,'Bad hair day','Embrace it','common',false,null,null,null),
  (7,'What you''re wearing right now','No filter','common',false,null,null,null),
  (8,'Your view out the window','Where you are today','common',true,null,null,null),
  (9,'A meal for one, eaten "together"','Dinner over video','common',false,null,null,null),
  (10,'Working / studying','Heads down','common',false,null,null,null),
  (11,'Doing nothing at all','The art of it','common',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'mundane-beautiful'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'A new city','First time there','rare',false,null::smallint,null::smallint,null::text),
  (1,'A hike','The view from the top','rare',false,null,null,null),
  (2,'Got lost on purpose','Wherever you ended up','common',false,null,null,null),
  (3,'Tried a scary food','The face you made','common',false,null,null,null),
  (4,'Watched a sunrise','Early enough to hurt','rare',false,null,null,null),
  (5,'A spontaneous yes','You said it, you did it','rare',false,null,null,null),
  (6,'On the water','Boat, lake, sea','common',false,null,null,null),
  (7,'A long drive','The open road','common',false,null,null,null),
  (8,'A festival or concert','Lights and crowd','rare',false,null,null,null),
  (9,'Somewhere high up','Mountain, tower, plane','common',false,null,null,null),
  (10,'A place we''ll never forget','You know the one','foil',false,null,null,null),
  (11,'Out past midnight','The adventure that ran late','common',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'adventures'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'6 months together','Half a year','foil',false,null::smallint,null::smallint,null::text),
  (1,'One year together','The big one','foil',false,null,null,null),
  (2,'Met the family','Officially','rare',false,null,null,null),
  (3,'Closed the distance (a visit)','The airport hug','foil',false,null,null,null),
  (4,'A graduation or promotion','Proud day','rare',false,null,null,null),
  (5,'An anniversary dinner','Dressed up','rare',false,null,null,null),
  (6,'Moved / a new key','A new chapter','rare',false,null,null,null),
  (7,'A goodbye at the airport','The hard kind','rare',false,null,null,null),
  (8,'A hello at the airport','The best kind','foil',false,null,null,null),
  (9,'Two years together','Still going','foil',false,null,null,null),
  (10,'A promise made','Whatever it was','rare',false,null,null,null),
  (11,'A milestone of your own','You decide','common',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'milestones'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'New Year''s moment','Midnight, wherever you are','foil',false,355::smallint,5::smallint,'Dec 21 – Jan 5'),
  (1,'First snow of the year','Catch it falling','rare',false,null,null,null),
  (2,'A summer day','Sun on your face','common',false,null,null,null),
  (3,'Autumn leaves','The colors','common',false,null,null,null),
  (4,'Spring bloom','Something flowering','common',false,null,null,null),
  (5,'A birthday','Cake and candles','rare',false,null,null,null),
  (6,'A holiday meal','The spread','common',false,null,null,null),
  (7,'Decorations up','Lights, tree, whatever','common',false,null,null,null),
  (8,'The 15th (our monthsversary)','This month''s','common',false,null,null,null),
  (9,'A rainy day','Cozy or grey','common',false,null,null,null),
  (10,'Dressed up for an occasion','Looking sharp','rare',false,null,null,null),
  (11,'A gift you wrapped','Before it''s opened','common',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'seasons-holidays'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'A silly face','The dumbest one','common',false,null::smallint,null::smallint,null::text),
  (1,'Your hands','Yours and mine','rare',true,null,null,null),
  (2,'Where you sleep','Your side','common',false,null,null,null),
  (3,'Our favorite spot','The usual place','common',false,null,null,null),
  (4,'A stranger we''ll remember','The funny encounter','common',false,null,null,null),
  (5,'Your eyes, up close','Just them','rare',false,null,null,null),
  (6,'Your handwriting','A note from you','common',false,null,null,null),
  (7,'Your neighborhood','A walk around','common',true,null,null,null),
  (8,'Bed head','Just woke up','common',false,null,null,null),
  (9,'Your shoes today','Where they took you','common',false,null,null,null),
  (10,'A self-portrait','How you see you','rare',true,null,null,null),
  (11,'The sky right now','Your sky and mine','common',true,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'faces-places'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'A bucket-list place','Finally there','foil',false,null::smallint,null::smallint,null::text),
  (1,'A skill we learned','Show the proof','rare',false,null,null,null),
  (2,'Saw something we always wanted to','Northern lights? Ocean?','foil',false,null,null,null),
  (3,'A concert we dreamed of','We made it','rare',false,null,null,null),
  (4,'Cooked a dish from your country','Yours and mine','rare',true,null,null,null),
  (5,'Did the scary thing','Whatever it was','rare',false,null,null,null),
  (6,'A goal we hit together','Crossed off','rare',false,null,null,null),
  (7,'Learned a phrase in your language','Used it for real','common',false,null,null,null),
  (8,'A "someday" that became today','You''ll know it','foil',false,null,null,null),
  (9,'Finished something long','A book, a project','common',false,null,null,null),
  (10,'A fear we faced','Together','rare',false,null,null,null),
  (11,'A promise we kept','Done','rare',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'someday-done'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'Best meal ever','Worth a photo','rare',false,null::smallint,null::smallint,null::text),
  (1,'Worst meal ever','For the laugh','common',false,null,null,null),
  (2,'Late-night snack','The 2am kind','common',false,null,null,null),
  (3,'Your comfort food','Yours and mine','common',true,null,null,null),
  (4,'A toast','Glasses up','common',false,null,null,null),
  (5,'Dessert we split','Or fought over','common',false,null,null,null),
  (6,'Street food','Somewhere new','common',false,null,null,null),
  (7,'A recipe we tried','Did it work?','common',false,null,null,null),
  (8,'Your favorite drink','In hand','common',false,null,null,null),
  (9,'Breakfast in bed','Lucky day','rare',false,null,null,null),
  (10,'A meal from home','Tastes like family','common',false,null,null,null),
  (11,'Something we''d never eat again','Document it','common',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'tastes'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'Our goodnight routine','How we end the day','common',false,null::smallint,null::smallint,null::text),
  (1,'Our greeting','How we say hi','common',false,null,null,null),
  (2,'A song that''s "ours"','Album art or the moment','rare',false,null,null,null),
  (3,'The thing you always say','Caught on camera','common',false,null,null,null),
  (4,'How we say sorry','The gesture','rare',false,null,null,null),
  (5,'Our handshake / sign','Do it','common',true,null,null,null),
  (6,'Sunday tradition','Whatever it is','common',false,null,null,null),
  (7,'Our show','Mid-episode','common',false,null,null,null),
  (8,'The pet name in action','A screenshot','common',false,null,null,null),
  (9,'How we wake each other','Alarm or call','common',false,null,null,null),
  (10,'Our little celebration','The happy dance','common',false,null,null,null),
  (11,'A ritual we invented','Just ours','rare',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'rituals'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'A hard season we survived','Made it through','foil',false,null::smallint,null::smallint,null::text),
  (1,'Something we forgave','Let it go','rare',false,null,null,null),
  (2,'A lesson we learned','The takeaway','rare',false,null,null,null),
  (3,'How we''ve changed','Then vs now','rare',false,null,null,null),
  (4,'Proud of you moment','Capture it','rare',false,null,null,null),
  (5,'A boundary we set','Healthy us','common',false,null,null,null),
  (6,'A habit we built together','The streak','common',false,null,null,null),
  (7,'When you were my strength','That day','foil',false,null,null,null),
  (8,'A compromise that worked','Met in the middle','common',false,null,null,null),
  (9,'Something we''re working on','Honest one','common',false,null,null,null),
  (10,'How far we''ve come','Look back','foil',false,null,null,null),
  (11,'A version of us we''re proud of','Right now','rare',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'growth'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'Where we''ll live','Mock it up','foil',false,null::smallint,null::smallint,null::text),
  (1,'Names we love','Written down','rare',false,null,null,null),
  (2,'A trip we''re planning','The pinned map','rare',false,null,null,null),
  (3,'Our future home, a detail','One room, one corner','common',false,null,null,null),
  (4,'The wedding idea','A vibe board','foil',false,null,null,null),
  (5,'A someday selfie','Us, old and happy','foil',true,null,null,null),
  (6,'A dream we share','Drawn or written','rare',false,null,null,null),
  (7,'The pet we''ll get','The breed / the name','common',false,null,null,null),
  (8,'A goal for next year','On paper','common',false,null,null,null),
  (9,'Where we''ll be in 5 years','Your guess','rare',false,null,null,null),
  (10,'A tradition we''ll start','The plan','common',false,null,null,null),
  (11,'The life we''re building','In one image','foil',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'dreams'
on conflict (chapter_id, position) do nothing;

insert into public.album_slots (chapter_id, position, title, hint, tier, is_duo, gate_start_doy, gate_end_doy, gate_label)
select c.id, v.position, v.title, v.hint, v.tier, v.is_duo, v.gs, v.ge, v.gl
from public.album_chapters c
cross join (values
  (0,'Our longest call','The screenshot of the timer','rare',false,null::smallint,null::smallint,null::text),
  (1,'Kilometers between us today','The map number','common',false,null,null,null),
  (2,'Countries stamped','Your passport page','common',false,null,null,null),
  (3,'Our song''s play count','Proof of obsession','common',false,null,null,null),
  (4,'A days-together milestone','100? 500? 1000?','rare',false,null,null,null),
  (5,'A receipt we kept','From a good day','common',false,null,null,null),
  (6,'Messages sent today','The notification','common',false,null,null,null),
  (7,'Time zones apart','Two clocks','common',true,null,null,null),
  (8,'Flights taken for us','A boarding pass','rare',false,null,null,null),
  (9,'Words learned in your language','The list','common',false,null,null,null),
  (10,'Our step count today','Walking to each other','common',false,null,null,null),
  (11,'A number that means us','You pick it','common',false,null,null,null)
) as v(position,title,hint,tier,is_duo,gs,ge,gl)
where c.slug = 'numbers'
on conflict (chapter_id, position) do nothing;
