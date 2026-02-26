-- ============================================================
-- 配信者管理システム Supabase Schema
-- ============================================================
-- 注意: Supabase SQL Editor で実行してください
-- ============================================================

-- Extension
create extension if not exists "pgcrypto";

-- ============================================================
-- streamers
-- ============================================================
create table if not exists streamers (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  status        text not null default 'active'
                  check (status in ('active','paused','graduated','dropped')),
  line_user_id  text not null unique,
  notify_enabled boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- self_check_templates
-- ============================================================
create table if not exists self_check_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  version     text not null,
  is_active   boolean not null default false,
  schema      jsonb not null,
  created_at  timestamptz not null default now()
);

-- activeは常に1つだけにするトリガー
create or replace function deactivate_other_templates()
returns trigger language plpgsql as $$
begin
  if new.is_active = true then
    update self_check_templates
    set is_active = false
    where id <> new.id and is_active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deactivate_templates on self_check_templates;
create trigger trg_deactivate_templates
  before insert or update on self_check_templates
  for each row execute function deactivate_other_templates();

-- ============================================================
-- self_checks
-- ============================================================
create table if not exists self_checks (
  id                   uuid primary key default gen_random_uuid(),
  streamer_id          uuid not null references streamers(id) on delete cascade,
  date                 date not null,
  template_id          uuid not null references self_check_templates(id),
  answers              jsonb not null default '{}',
  memo                 text,
  overall_score        int check (overall_score between 0 and 100),
  ai_type              text check (ai_type in ('GOOD','NORMAL','SUPPORT')),
  ai_comment           text,
  ai_next_action       text,
  ai_negative_detected boolean,
  created_at           timestamptz not null default now(),
  unique (streamer_id, date)
);

create index if not exists idx_self_checks_streamer_date
  on self_checks (streamer_id, date desc);

create index if not exists idx_self_checks_date
  on self_checks (date desc);

-- ============================================================
-- staff_notes
-- ============================================================
create table if not exists staff_notes (
  id            uuid primary key default gen_random_uuid(),
  streamer_id   uuid not null references streamers(id) on delete cascade,
  date          date not null,
  category      text not null default '',
  current_state text not null default '',
  action        text not null default '',
  next_action   text not null default '',
  status        text not null default 'open'
                  check (status in ('open','watching','closed')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_staff_notes_streamer
  on staff_notes (streamer_id, date desc);

-- ============================================================
-- checkin_tokens
-- ============================================================
create table if not exists checkin_tokens (
  id          uuid primary key default gen_random_uuid(),
  streamer_id uuid not null references streamers(id) on delete cascade,
  date        date not null,
  token_hash  text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (streamer_id, date)
);

create index if not exists idx_checkin_tokens_hash
  on checkin_tokens (token_hash);

-- ============================================================
-- line_jobs
-- ============================================================
create table if not exists line_jobs (
  id          uuid primary key default gen_random_uuid(),
  streamer_id uuid not null references streamers(id) on delete cascade,
  date        date not null,
  kind        text not null
                check (kind in ('daily_checkin','checkin_thanks')),
  status      text not null default 'queued'
                check (status in ('queued','sending','sent','failed','skipped')),
  attempts    int not null default 0,
  last_error  text,
  locked_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (streamer_id, date, kind)
);

create index if not exists idx_line_jobs_status_date
  on line_jobs (status, date);

create index if not exists idx_line_jobs_locked_at
  on line_jobs (locked_at)
  where locked_at is not null;

-- updated_at自動更新トリガー
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_line_jobs_updated_at on line_jobs;
create trigger trg_line_jobs_updated_at
  before update on line_jobs
  for each row execute function update_updated_at();

-- ============================================================
-- サンプルデータ（任意 / 開発用）
-- ============================================================
-- テンプレート1件
insert into self_check_templates (name, version, is_active, schema)
values (
  '標準テンプレ v1',
  '1.0',
  true,
  '{
    "fields": [
      {"key":"pre_announce","label":"配信告知をした","type":"boolean","required":true},
      {"key":"pre_theme","label":"テーマを決めた","type":"boolean","required":true},
      {"key":"live_greeting","label":"挨拶ができた","type":"boolean","required":true},
      {"key":"live_comment_reply","label":"コメントに返信できた","type":"boolean","required":true},
      {"key":"live_keep_time","label":"予定時間通りに配信できた","type":"boolean","required":true},
      {"key":"post_review","label":"配信後の振り返りをした","type":"boolean","required":true},
      {"key":"post_sns","label":"SNS投稿をした","type":"boolean","required":false},
      {"key":"post_memo","label":"今日の配信の感想（自由記述）","type":"text","required":false}
    ]
  }'::jsonb
)
on conflict do nothing;
