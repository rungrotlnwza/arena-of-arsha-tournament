-- ============================================================
-- Migration: เพิ่มคอลัมน์การยอมรับเงื่อนไข 3 รายการ
-- สำหรับฐานข้อมูลที่มีอยู่แล้ว
-- ============================================================

-- เพิ่มคอลัมน์ agree_discord (ถ้ายังไม่มี)
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS agree_discord TINYINT(1) DEFAULT 0 COMMENT 'ยอมรับเข้าร่วม Discord';

-- เพิ่มคอลัมน์ agree_rules (ถ้ายังไม่มี)
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS agree_rules TINYINT(1) DEFAULT 0 COMMENT 'ยอมรับกติกาการแข่งขัน';

-- เพิ่มคอลัมน์ agree_live (ถ้ายังไม่มี)
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS agree_live TINYINT(1) DEFAULT 0 COMMENT 'ยินยอมให้ถ่ายทอดสด';

-- อัปเดตข้อมูลเก่าให้มีค่าเริ่มต้น (ถ้าต้องการ)
-- UPDATE teams SET agree_discord = 1, agree_rules = 1, agree_live = 0 WHERE created_at < '2026-04-01';
