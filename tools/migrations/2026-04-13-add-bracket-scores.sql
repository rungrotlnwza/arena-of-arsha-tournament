ALTER TABLE bracket
ADD COLUMN team1_score INT NULL COMMENT 'คะแนนทีมที่ 1' AFTER team2_id,
ADD COLUMN team2_score INT NULL COMMENT 'คะแนนทีมที่ 2' AFTER team1_score;
