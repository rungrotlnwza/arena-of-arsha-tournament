-- ============================================================
-- Database Migration for Arena of Arsha Tournament
-- ปรับโครงสร้างฐานข้อมูลให้ตรงกับฟอร์มสมัครใหม่
-- ============================================================

-- 1. ปรับตาราง teams: ลบคอลัมน์ที่ไม่ใช้แล้ว (experience, referral)
-- หากต้องการเก็บข้อมูลเก่าไว้ ให้ข้ามขั้นตอนนี้
-- แต่ถ้าต้องการลบออกจริงๆ ใช้คำสั่งด้านล่าง:

-- ALTER TABLE teams DROP COLUMN experience;
-- ALTER TABLE teams DROP COLUMN referral;

-- หรือถ้าต้องการให้เป็น nullable (ไม่บังคับ) แทน:
-- ALTER TABLE teams MODIFY COLUMN experience VARCHAR(500) NULL;
-- ALTER TABLE teams MODIFY COLUMN referral VARCHAR(100) NULL;

-- 2. ปรับตาราง players: ลบคอลัมน์ bdo_name และ full_name
-- เหลือเฉพาะ family_name ที่จำเป็น

-- ลบคอลัมน์ bdo_name (ถ้ามี):
-- ALTER TABLE players DROP COLUMN bdo_name;

-- ลบคอลัมน์ full_name (ถ้ามี) เพราะใช้ family_name แทน:
-- ALTER TABLE players DROP COLUMN full_name;

-- ============================================================
-- ตัวเลือกที่แนะนำ: แก้ไขโครงสร้างตารางใหม่
-- ============================================================

-- ตาราง teams ใหม่ (แนะนำ):
/*
CREATE TABLE teams_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL UNIQUE,
    status ENUM('pending', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending',
    agree_live TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ย้ายข้อมูลจากตารางเก่า (ถ้าต้องการเก็บข้อมูลเก่า):
-- INSERT INTO teams_new (id, team_name, status, agree_live, created_at, updated_at)
-- SELECT id, team_name, status, agree_live, created_at, updated_at FROM teams;
*/

-- ตาราง players ใหม่ (แนะนำ):
/*
CREATE TABLE players_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    family_name VARCHAR(100) NOT NULL,
    discord_id VARCHAR(100) NOT NULL,
    player_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- ย้ายข้อมูลจากตารางเก่า:
-- INSERT INTO players_new (id, team_id, family_name, discord_id, player_order, created_at)
-- SELECT id, team_id, family_name, discord_id, player_order, created_at FROM players;
*/

-- ============================================================
-- คำสั่งง่ายๆ สำหรับการปรับตารางเดิม (ไม่ลบข้อมูล)
-- ============================================================

-- ทำให้คอลัมน์ที่ไม่ใช้แล้วเป็น NULL (ไม่บังคับกรอก)
ALTER TABLE teams MODIFY COLUMN experience VARCHAR(500) NULL;
ALTER TABLE teams MODIFY COLUMN referral VARCHAR(100) NULL;

ALTER TABLE players MODIFY COLUMN bdo_name VARCHAR(100) NULL;
ALTER TABLE players MODIFY COLUMN full_name VARCHAR(100) NULL;

-- เพิ่ม comment ว่าคอลัมน์ไหนเลิกใช้แล้ว (MySQL 8.0+)
-- ALTER TABLE teams MODIFY COLUMN experience VARCHAR(500) NULL COMMENT 'DEPRECATED: ไม่ใช้แล้วตั้งแต่เมษายน 2026';
-- ALTER TABLE teams MODIFY COLUMN referral VARCHAR(100) NULL COMMENT 'DEPRECATED: ไม่ใช้แล้วตั้งแต่เมษายน 2026';
-- ALTER TABLE players MODIFY COLUMN bdo_name VARCHAR(100) NULL COMMENT 'DEPRECATED: ไม่ใช้แล้วตั้งแต่เมษายน 2026';
-- ALTER TABLE players MODIFY COLUMN full_name VARCHAR(100) NULL COMMENT 'DEPRECATED: ใช้ family_name แทน';
