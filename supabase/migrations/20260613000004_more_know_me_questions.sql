-- ════════════════════════════════════════════════════════════════════════
-- Know-Me — grow the starter catalog (~24 → ~48)
--
-- At three questions a day the original two-dozen recycled in about a week.
-- Doubling the pool pushes the first repeat out past two weeks and keeps the
-- daily draw feeling fresh. Catalog rows have created_by NULL (is_custom false).
-- ════════════════════════════════════════════════════════════════════════

insert into public.know_me_questions (prompt, category, options) values
  ('My favorite time of day with you?', 'love', '[{"id":"a","label":"Slow mornings"},{"id":"b","label":"Midday check-ins"},{"id":"c","label":"Evening wind-down"},{"id":"d","label":"Late-night talks"}]'),
  ('The little thing I miss most across the distance?', 'love', '[{"id":"a","label":"Your hugs"},{"id":"b","label":"Your voice in person"},{"id":"c","label":"Doing nothing together"},{"id":"d","label":"Falling asleep near you"}]'),
  ('My happy place?', 'general', '[{"id":"a","label":"By the sea"},{"id":"b","label":"In the mountains"},{"id":"c","label":"A busy city"},{"id":"d","label":"Home, under a blanket"}]'),
  ('What I splurge on without guilt?', 'quirks', '[{"id":"a","label":"Good food"},{"id":"b","label":"Travel"},{"id":"c","label":"Tech / gadgets"},{"id":"d","label":"Gifts for you"}]'),
  ('My weekend ideal?', 'quirks', '[{"id":"a","label":"Totally unplanned"},{"id":"b","label":"A loose plan"},{"id":"c","label":"Fully scheduled fun"},{"id":"d","label":"Pure rest"}]'),
  ('How I show I care?', 'love', '[{"id":"a","label":"I say it"},{"id":"b","label":"I do things for you"},{"id":"c","label":"I give little gifts"},{"id":"d","label":"I just want to be near"}]'),
  ('My favorite weather?', 'general', '[{"id":"a","label":"Sunny and warm"},{"id":"b","label":"Cool and crisp"},{"id":"c","label":"Rainy and cozy"},{"id":"d","label":"First snow"}]'),
  ('My dream tiny tradition for us?', 'future', '[{"id":"a","label":"A weekly date night"},{"id":"b","label":"Sunday cooking"},{"id":"c","label":"A yearly trip"},{"id":"d","label":"Morning texts forever"}]'),
  ('What cheers me up fastest?', 'love', '[{"id":"a","label":"A silly meme"},{"id":"b","label":"A voice note"},{"id":"c","label":"A surprise plan"},{"id":"d","label":"Just venting to you"}]'),
  ('My music mood most days?', 'quirks', '[{"id":"a","label":"Calm / acoustic"},{"id":"b","label":"Pop / upbeat"},{"id":"c","label":"Throwbacks"},{"id":"d","label":"Whatever you send me"}]'),
  ('The trip I daydream about most?', 'future', '[{"id":"a","label":"A road trip"},{"id":"b","label":"A beach escape"},{"id":"c","label":"A big city"},{"id":"d","label":"A quiet countryside"}]'),
  ('My favorite kind of message from you?', 'love', '[{"id":"a","label":"Good-morning ones"},{"id":"b","label":"Random I-miss-you"},{"id":"c","label":"Photos of your day"},{"id":"d","label":"Long voice notes"}]'),
  ('My ideal breakfast?', 'food', '[{"id":"a","label":"Sweet (pancakes)"},{"id":"b","label":"Savory (eggs)"},{"id":"c","label":"Just coffee"},{"id":"d","label":"Whatever is fast"}]'),
  ('How I prefer to plan a trip?', 'quirks', '[{"id":"a","label":"Spreadsheet everything"},{"id":"b","label":"A rough outline"},{"id":"c","label":"Wing it"},{"id":"d","label":"You decide"}]'),
  ('What makes me feel most loved?', 'love', '[{"id":"a","label":"Being listened to"},{"id":"b","label":"Small surprises"},{"id":"c","label":"Quality time"},{"id":"d","label":"Being held"}]'),
  ('My secret talent?', 'quirks', '[{"id":"a","label":"Remembering details"},{"id":"b","label":"Making people laugh"},{"id":"c","label":"Cooking by instinct"},{"id":"d","label":"Sensing your mood"}]'),
  ('What I want our home to feel like?', 'future', '[{"id":"a","label":"Warm and cozy"},{"id":"b","label":"Bright and open"},{"id":"c","label":"Full of plants"},{"id":"d","label":"Always full of us"}]'),
  ('My go-to comfort show?', 'quirks', '[{"id":"a","label":"A sitcom rewatch"},{"id":"b","label":"Something cozy"},{"id":"c","label":"A documentary"},{"id":"d","label":"Whatever we both like"}]'),
  ('My favorite dessert?', 'food', '[{"id":"a","label":"Chocolate anything"},{"id":"b","label":"Ice cream"},{"id":"c","label":"Fruit and pastry"},{"id":"d","label":"Cheesecake"}]'),
  ('What I am most proud of in us?', 'love', '[{"id":"a","label":"How we communicate"},{"id":"b","label":"How we keep trying"},{"id":"c","label":"How we trust"},{"id":"d","label":"How we grow"}]'),
  ('My ideal anniversary?', 'future', '[{"id":"a","label":"A fancy night out"},{"id":"b","label":"A weekend away"},{"id":"c","label":"Recreating our first date"},{"id":"d","label":"Quiet, just us"}]'),
  ('What I do when I cannot sleep?', 'quirks', '[{"id":"a","label":"Text you"},{"id":"b","label":"Scroll my phone"},{"id":"c","label":"Read or listen"},{"id":"d","label":"Overthink everything"}]'),
  ('The first thing I notice about a place?', 'quirks', '[{"id":"a","label":"The food"},{"id":"b","label":"The people"},{"id":"c","label":"The views"},{"id":"d","label":"The vibe"}]'),
  ('What I want more of this year?', 'future', '[{"id":"a","label":"Time together"},{"id":"b","label":"New adventures"},{"id":"c","label":"Calm and rest"},{"id":"d","label":"Big plans coming true"}]');
