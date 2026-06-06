# Katitos — Possible Features (research backlog)

A backlog of feature ideas for our LDR app, gathered from a multi-agent web
research sweep across existing couple apps (Paired, Between, Cupla, Lovewick,
Agapé, Honi, Kindu, Coral, Lasting, Gottman, Flamme…), LDR game/activity
listicles, relationship-science sources (Gottman Institute, love languages,
attachment theory), and real couple rituals (r/LongDistance, blogs).

These are **not built yet** — they're a menu to pull from. Everything already
shipped (polaroid, countdowns, quizzes, date log, Georgia planner, games +
leaderboards, cute-words dictionary, language learning, decisions log, baby
names, swipe wishlists, scavenger cards, presence/last-seen, finance goals,
chalkboard wall, flowers tracker, distance/timezone/currency widgets,
days-together, fight timer, puñito) is intentionally excluded.

**Legend:** each item is `**Name** — what it is. (Why it's good for us · build: low/med/high)`

Thanks to the modular architecture (a feature = a folder + one registry line,
games via `defineGame`, quizzes/decks via the deck engine, dashboard cards via
`defineWidget`), most of these are cheap to add later.

---

## 1. Communication & presence

- **Emotional weather report** — pick a weather icon (sunny/stormy/foggy) + one line for your inner climate. (At-a-glance mood you can't sense across distance · build: low)
- **"How are you _really_?" check-in** — one-tap prompt past "I'm fine," logged for both. (Replaces in-person cues · build: low)
- **Shared mood graph** — both partners' moods on one timeline; dips and good streaks visible. (Surfaces a rough week you couldn't observe · build: med)
- **Energy / social-battery slider** — show how charged or drained you feel. (Calibrates when to call · build: low)
- **Body/health check-in** — quick log of sleep, period, illness, pain, shared with gentle care suggestions. (Lets a distant partner "notice" · build: low)
- **Stress dump before connection** — "biggest stress I'm carrying" field surfaced at the start of a call. (Restore the bond before content · build: low)
- **Rose / thorn of the day** — log one high + one low daily, paired side-by-side. (Rebuilds the "how was your day" dinner ritual · build: low)
- **Partner low-battery alert** — notify the other when your phone is dying. (Explains sudden silence before it's misread · build: med)
- **Live presence / typing status** — subtle "online / typing / in class / heading to bed." (Ambient awareness reduces out-of-sync feeling · build: med)
- **Lock-screen mood widget** — push a mood/selfie/status to the partner's home-screen widget. (Ambient affection without a message · build: med)
- **Doodle-on-photo / live sketch** — draw on a shared canvas or over a photo in real time. (Tactile expression text can't carry · build: med)
- **Voice & video message capsules** — async recorded clips in a private thread. (Voice keeps intimacy alive across opposite schedules · build: med)

## 2. Connection & question games

- **36 Questions** — Aron's escalating-intimacy deck, answered one at a time. (Manufactures deep closeness in one call · build: low)
- **"We're Not Really Strangers" tiered deck** — perception → connection → reflection levels. (Paced emotional depth for slow async reveals · build: low)
- **Newlywed agreement game** — both privately answer the same question, score a point on a match. (Friendly competition + discovering alignment · build: med — reuses deck engine)
- **Best Friends Check** — guess each other's answers about themselves; "how well do you know me" score. (Reveals knowledge gaps to discuss · build: med)
- **Two truths and a lie** — three statements, guess the false one. (Bite-sized, playable by voice note · build: low)
- **Blind ranking** — both rank the same list (foods, cities, love languages) and compare. (Great talking points · build: med)
- **Hot takes / unpopular opinions** — trade spicy opinions, rate agreement. (Surfaces values in a fun, debate-y way · build: low)
- **Confession jar** — drop small admissions the other opens later. (Easier to write than say aloud · build: low)
- **Love mad-libs** — fill-in-the-blank sweet/cheeky templates for each other. (Personalized, save-worthy · build: low)
- **Truth or drink (video-call edition)** — answer honestly or take a sip. (Turns a call into a date-night ritual · build: low)

## 3. Two-player games

- **Correspondence chess / checkers** — turn-based, move whenever free. (Works across any time zone · build: high)
- **Word-tile duel** — Scrabble-style board built over days. (Low-pressure turns fit offset schedules · build: high)
- **Connect-Four / Gomoku** — quick synced or turn-based grid game. (Easy to pick up between tasks · build: med)
- **Battleship** — hidden-grid guessing duel. (Turn-based, no co-presence needed · build: med)
- **Co-op daily logic puzzle** — shared daily crossword/sudoku/wordle with one joint streak. (A tiny shared daily accomplishment · build: med)
- **Memory match of your photos** — concentration game built from your own pictures. (Gameplay doubles as reliving memories · build: med — uses games framework)
- **Collaborative drawing / guessing (Gartic-style)** — doodle a secret prompt, partner guesses. (Laughter + saved doodles · build: high)
- **Asymmetric clue puzzle** — each sees half the pieces, must describe to solve. (Forces voice collaboration · build: high)

## 4. Rituals (daily / weekly)

- **Song of the day** — pin one track daily; build a chronological "soundtrack of us." (Daily touchpoint revealing mood · build: low)
- **Shared evolving playlist** — co-edited, annotate why each song made the cut. (An always-on shared space that grows · build: low)
- **Good-morning / good-night handoff + streak** — one-tap bookends, logs who said it first. (Recreates waking/sleeping together · build: low)
- **Goodnight beacon across time zones** — gentle "I'm asleep now" signal. (Closes the day with care despite offset · build: low)
- **Synced "do it together" moments** — prompts to do the same small thing at once (toast, same song, look at the moon). (Manufactures shared presence · build: med)
- **Gratitude / appreciation exchange + jar** — nightly "one thing I appreciated," collected to re-read on hard days. (Banks positives when daily kindness is unseen · build: low)
- **Daily couple affirmation** — a shared affirmation both can react to. (Reinforces "we-ness" · build: low)
- **Weekly date goal + reminder** — target N (virtual) dates/week, nudged to protect the time. (Quality time doesn't get crowded out · build: low)
- **Question of the day** — already have the deck; could surface it as a daily push ritual with streak. (Daily seed for conversation · build: low)

## 5. Memory keeping

- **Shared memory timeline / album with reactions** — a private chronological feed both contribute to, react and comment. (Co-built archive makes the relationship feel substantial · build: med)
- **Solo-added memories** — quietly add a note on your own, surfaced to the other later. (Capture a thought even when they're asleep · build: low)
- **"Open when…" envelopes** — pre-written notes by mood (miss me / can't sleep / bad day) opened on demand. (Comfort in the exact lonely moment · build: med)
- **Time-capsule letters** — letters sealed until a future date (reunion, one-year mark) that auto-unlock. (Gives the distance a finish line + reward · build: med)
- **Voice-note keepsake jar** — save + pin favorite voice memos to replay. (An archive that becomes a comfort object · build: low)
- **Dream journal** — log dreams (especially of each other) into a shared feed. (Intimate window into the subconscious · build: low)
- **Care-package tracker** — log contents (with hidden "open me last" items) + tracking number, watch it progress. (Stretches the gift's joy across shipping · build: med)
- **"Forget-me-not" partner-detail vault** — save favorites, sizes, important small dates. (Remembering signals you're paying attention · build: low)
- **"What I learned about you" log** — capture new discoveries about each other. (Counters the fear of becoming strangers · build: low)
- **Auto-context on memories** — stamp date/time/location automatically. (Richer map of where each of you was · build: low)

## 6. Presence & "touch"

- **Tap-to-feel / virtual touch** — tap a screen spot, partner's phone buzzes a matching haptic. (Wordless "thinking of you" approximating contact · build: high)
- **Thumb-kiss synchrony** — both press the same spot at once, phones buzz in unison. (Rare literal synchrony · build: high)
- **One-tap hug / kiss** — hold phone to chest to "send a hug" that arrives as a notification. (Low-effort affection bursts · build: low)
- **"Same moon" + "looking up now" ping** — live shared moon phase + a tap to say you're looking up. (Makes "under the same moon" real · build: med)
- **Weather-in-your-city widget** — partner's live local weather. (Small caretaking — "grab an umbrella" · build: low)
- **Alarm-for-partner** — set a gentle wake/reminder alarm that rings on their phone with a message. (The "wake up sleepyhead" ritual · build: med)
- **Lit-screen / lamp ping** — light an ambient color on the other side instantly. (Passive presence in their room · build: high)

## 7. Growth (relationship science)

- **Daily appreciation (5:1 builder)** — nudge toward Gottman's 5:1 positive ratio. (Deliberately banks positives · build: low)
- **Emotional bank-account meter** — a playful balance that ticks up with appreciations and bids. (Makes connection concrete · build: med)
- **Repair-ritual button** — a chosen "we're okay" gesture to signal reconnection without re-litigating. (De-escalation when you can't hug it out · build: low — pairs with fight timer)
- **Repair-attempts phrasebook** — tappable softening phrases ("I'm feeling defensive, can we restart?"). (Text strips tone; pre-vetted phrases prevent spirals · build: low)
- **Time-out / pause agreement** — "I need a break, back by [time]." (Turns a pause into a promise, not abandonment · build: low)
- **Post-fight debrief** — guided template: what I felt / heard / needed / will do. (Structures repair without body language · build: med)
- **Soft-startup composer** — reframe a complaint as "I feel X about Y, I need Z" before sending. (Catches harsh starts before they're sent · build: med)
- **Issue parking lot** — capture a touchy topic for the next check-in instead of ambushing a call. (Protects scarce live time · build: low)
- **"State of the Union" weekly meeting** — guided appreciations → what's going well → repairs → "how can I make you feel more loved?" (Replaces ambient maintenance distance erodes · build: med)
- **Relationship goals board** — shared goals (visit frequency, close-the-gap date) with progress + nudges. (The single biggest morale anchor · build: med)
- **Values-alignment exercise** — periodic prompts on money/family/faith/lifestyle to spot drift early. (Prevents a painful reunion mismatch · build: med — reuses deck engine)
- **Love-language tracker** — profile each language; suggest distance-friendly ways to "speak" it. (Touch/quality-time need creative remote translation · build: med)
- **Love Map quiz** — rotating questions about each other's fears, dreams, stressors. (Keeps your mental model current · build: med — reuses deck engine)
- **Need-of-the-week** — each names one concrete thing they need this week, tracked to done. (Makes support actionable · build: low)
- **Annual relationship reflection** — once-a-year guided review of growth + goals. (Turns a year apart into a story of progress · build: med)

## 8. Planning & logistics

- **Unified two-calendar merge** — overlay both partners' schedules + time zones to find call windows. (Solving "when are we both free" is a daily pain · build: high)
- **Shared prioritized to-do lists** — co-managed lists with labels and reminders. (Coordinate visit prep, gift buying · build: med)
- **Love coupons / vouchers** — send redeemable coupons (a chore, a date, a favor) to cash in on the next visit. (Promises of in-person treats · build: med)
- **Categorized couples bucket list** — Adventure / Cozy / Spicy / Milestones / Someday, with "done" celebration. (Forward-looking "when we're together" fuel · build: med)
- **Virtual date-night menu** — a spinner/deck of remote date ideas (cook-along, museum tour, stargaze). (Removes "what should we do tonight" friction · build: med — reuses deck engine)
- **Synced watch-together** — synced play/pause + reaction strip for movie nights. (The couch-cuddle movie night across distance · build: high)
- **Double-blind desire matching** — both privately swipe on intimacy/date ideas; only mutual matches reveal. (Surfaces shared desires safely · build: med — reuses swipe deck)
- **Couple stats dashboard** — fun metrics: messages, calls, streaks, songs shared, words learned. (Celebrates the invisible effort · build: med)

## 9. Language exchange (RU ↔ ES)

- **Daily mutual word-swap** — each sends one word; the other must use it back in a sentence. (Guaranteed daily exchange with a goal · build: low)
- **Pronunciation duel** — record a phrase, partner records the "correct" version, overlay both. (Turns correction into a game · build: med)
- **Target-language-only day** — toggle a window where you message only in the language you're learning, with a help button. (The relationship becomes the immersion · build: low)
- **Survival-dialog deck** — practical couple-life phrases (ordering food, meeting parents, "I miss you"). (Learning aimed at the real shared future · build: low — reuses deck engine)
- **Tandem timer** — flips which language you speak every 10–15 min on calls. (Fair practice so one language doesn't dominate · build: low)
- **Voice-note language feedback** — send a target-language memo; partner reacts "nailed it" or attaches a correction. (Low-pressure async practice · build: med)

## 10. Other / nice-to-have

- **App PIN / Face ID lock** — local passcode on the private space. (Peace of mind for intimate content · build: low)
- **Custom user-authored prompts & dares** — add your own deck cards / dares. (Inside-jokes generic packs can't provide · build: low — reuses deck engine)
- **Recipe vault + cook-together mode** — saved recipes to make once you close the distance; split-screen step sync. (A hopeful cohabitation to-do + shared activity · build: med)
- **Reading club for two** — shared book with a synced page marker + per-chapter reactions. (A slow shared experience that sparks conversation · build: med)
- **Habit pact / co-op streak** — one joint daily habit (water, steps, journaling). (Mutual accountability = a daily reason to check in · build: med)
- **Photo prompt challenge** — a daily themed photo (your sky, your hands, something blue). (Glimpses of each other's everyday world · build: low — reuses camera + storage)
- **Online museum / Street View wander** — pick a virtual destination and explore together on a call. (A low-cost "we went somewhere" · build: low)
- **Future-home / vision board** — collaborative canvas of the life you're building. (Keeps the "why we endure this" vivid · build: med)

---

_Sources include: Cupla's "11 apps for long-distance couples," Endless Distances
& Lasting the Distance LDR game roundups, Lovebox connection-ritual posts, the
Gottman Institute blog (bids, repair, State of the Union, love maps), Greater
Good's 36 Questions, the 5 Love Languages, and assorted r/LongDistance threads._
