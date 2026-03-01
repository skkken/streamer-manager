-- streamers テーブルのレベル制約を 0-4 → 1-8 に更新（level_override / level_current）

-- 既存データの修正: level_current = 0 → 1, level_override = 0 → null
update streamers set level_current = 1 where level_current = 0;
update streamers set level_override = null where level_override = 0;

-- level_current の制約更新
alter table streamers drop constraint if exists streamers_level_current_range;
alter table streamers
  add constraint streamers_level_current_range
  check (level_current between 1 and 8);

-- level_current のデフォルトを 0 → 1 に変更
alter table streamers alter column level_current set default 1;

-- level_max の制約更新（0-4 → 0-8）
alter table streamers drop constraint if exists streamers_level_max_range;
alter table streamers
  add constraint streamers_level_max_range
  check (level_max between 0 and 8);

-- level_override の制約更新
alter table streamers drop constraint if exists streamers_level_override_range;
alter table streamers
  add constraint streamers_level_override_range
  check (level_override is null or level_override between 1 and 8);
