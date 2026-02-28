-- for_level の制約を旧 0-4 から新 1-8（G=8）に更新
alter table self_check_templates
  drop constraint if exists self_check_templates_for_level_check,
  drop constraint if exists self_check_templates_for_level_range;

alter table self_check_templates
  add constraint self_check_templates_for_level_range
  check (for_level between 1 and 8);
