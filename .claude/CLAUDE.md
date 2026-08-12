# Katitos — Claude working rules

## Git: commits & push

- **Force-push to `main` is allowed** — no problem.
- Use **Conventional Commits**.
- **Always** include a **scope** and a **gitmoji**.
- **Never** add co-authors, trailers, or commit bodies/descriptions — subject line only.
- Format: `type(scope): :gitmoji: <message>`
- Example: `feat(supabase): :sparkles: add function for computing currency rates`
- **One commit = one file.** 235 changed files → 235 commits. Stage exactly one file per commit, always.

## Changelog: every shipped change

- Anastasia wants to know what changed. **Every release that touches anything she can see updates `src/app/changelog.ts`.**
- Add a NEW entry at the top, or extend the top one if it hasn't shipped yet. Bump `package.json` in the same change.
- **Write it for her, not for a developer.** One line per thing she can now _do_. No table names, no bug ids, no "refactor". If a line wouldn't make sense read aloud over a call, rewrite it.
- The modal re-arms itself: "seen" is a **content digest** (`changelogKey`), so editing a single word brings the modal back for both of us. There is no version number to remember.
- Never edit `changelog_seen_key` / `changelog_announced_key` by hand to force it — just write the entry.
- Entries stay signed **"By your nerd Katito"**.

## UI: spacing

- **Hates unnecessary paddings, margins, and empty space.** Keep the UI tight. Whenever you touch a component, strip dead spacing — oversized `p-*`/`py-*`/`gap-*`/`space-y-*`, empty wrappers, ghost gaps left after deleting text. Default to the minimum that still reads cleanly.
