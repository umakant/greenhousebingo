-- Pattern / game image for bingo game library entries
ALTER TABLE event_bingo_games ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048) NULL;
