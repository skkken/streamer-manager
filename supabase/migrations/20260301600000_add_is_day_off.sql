-- self_checks に「休み」フラグを追加
ALTER TABLE self_checks ADD COLUMN is_day_off boolean NOT NULL DEFAULT false;
