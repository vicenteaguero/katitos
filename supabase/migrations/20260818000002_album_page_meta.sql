-- ════════════════════════════════════════════════════════════════════════
-- Katitos — a page can say what it is
--
--   "Santorini, the morning we missed the boat" — a page deserves a name and a
--   date of its own, and the shelf wants to know when a book last changed.
--   Purely additive: the old bundle selects * and ignores what it doesn't know.
-- ════════════════════════════════════════════════════════════════════════

alter table public.album_pages
  add column if not exists title text,
  add column if not exists on_date date,
  add column if not exists updated_at timestamptz not null default now();

alter table public.album_books
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists album_pages_updated_at on public.album_pages;
create trigger album_pages_updated_at before update on public.album_pages
  for each row execute function public.set_updated_at();

drop trigger if exists album_books_updated_at on public.album_books;
create trigger album_books_updated_at before update on public.album_books
  for each row execute function public.set_updated_at();
