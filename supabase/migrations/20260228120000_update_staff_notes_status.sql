-- staff_notes.status を新しい5種類に更新
-- 1. 先に古い制約を削除
alter table staff_notes drop constraint if exists staff_notes_status_check;

-- 2. 既存データのマッピング: open→preparing, watching→caution, closed→good
update staff_notes set status = 'preparing' where status = 'open';
update staff_notes set status = 'caution'   where status = 'watching';
update staff_notes set status = 'good'      where status = 'closed';

-- 3. 新しい制約を追加
alter table staff_notes
  add constraint staff_notes_status_check
  check (status in ('preparing','good','mostly_good','caution','danger'));

alter table staff_notes alter column status set default 'preparing';
