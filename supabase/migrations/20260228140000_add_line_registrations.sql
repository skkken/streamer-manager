create table if not exists line_registrations (
  id                uuid primary key default gen_random_uuid(),
  line_user_id      text not null unique,
  line_display_name text,
  status            text not null default 'pending'
                      check (status in ('pending', 'registered')),
  created_at        timestamptz not null default now()
);
