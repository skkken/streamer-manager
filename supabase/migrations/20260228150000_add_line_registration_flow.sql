alter table line_registrations
  add column if not exists step        text not null default 'ask_name'
                                         check (step in ('ask_name', 'ask_tiktok', 'ask_office', 'done')),
  add column if not exists input_name  text,
  add column if not exists tiktok_id   text,
  add column if not exists office_name text;
