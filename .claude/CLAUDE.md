# Katitos — Claude working rules

## Git: commits & push

- **Force-push to `main` is allowed** — no problem.
- Use **Conventional Commits**.
- **Always** include a **scope** and a **gitmoji**.
- **Never** add co-authors, trailers, or commit bodies/descriptions — subject line only.
- Format: `type(scope): :gitmoji: <message>`
- Example: `feat(supabase): :sparkles: add function for computing currency rates`
- **One commit = one file.** 235 changed files → 235 commits. Stage exactly one file per commit, always.
