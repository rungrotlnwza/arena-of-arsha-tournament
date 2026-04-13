-- ============================================================
-- Arena of Arsha Tournament - Database Schema
-- ฐานข้อมูลสำหรับระบบจัดการการแข่งขัน Arena of Arsha
-- ============================================================

-- สร้าง Database (ถ้ายังไม่มี)
-- CREATE DATABASE IF NOT EXISTS arena_of_arsha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE arena_of_arsha;

-- ============================================================
-- 1. ตาราง admins (ผู้ดูแลระบบ)
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. ตาราง config (การตั้งค่าระบบ)
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. ตาราง teams (ข้อมูลทีม)
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL UNIQUE,
    status ENUM('pending', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending',
    agree_discord TINYINT(1) DEFAULT 0 COMMENT 'ยอมรับเข้าร่วม Discord',
    agree_rules TINYINT(1) DEFAULT 0 COMMENT 'ยอมรับกติกาการแข่งขัน',
    agree_live TINYINT(1) DEFAULT 0 COMMENT 'ยินยอมให้ถ่ายทอดสด',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. ตาราง players (ข้อมูลผู้เล่น)
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    family_name VARCHAR(100) NOT NULL COMMENT 'ชื่อตระกูลในเกม Black Desert',
    discord_id VARCHAR(100) NOT NULL COMMENT 'Discord ID (ไม่รวม # และตัวเลข)',
    player_order INT NOT NULL DEFAULT 1 COMMENT 'ลำดับผู้เล่น (1 หรือ 2)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. ตาราง bracket (ตารางแข่งขัน)
-- ============================================================
CREATE TABLE IF NOT EXISTS bracket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    round VARCHAR(50) NOT NULL COMMENT 'รอบการแข่งขัน (round_1, round_2, quarter, semi, final)',
    match_number INT NOT NULL COMMENT 'หมายเลขคู่แข่งขันในรอบ',
    team1_id INT DEFAULT NULL COMMENT 'ทีมที่ 1',
    team2_id INT DEFAULT NULL COMMENT 'ทีมที่ 2',
    team1_score INT DEFAULT NULL COMMENT 'คะแนนทีมที่ 1',
    team2_score INT DEFAULT NULL COMMENT 'คะแนนทีมที่ 2',
    winner_id INT DEFAULT NULL COMMENT 'ทีมที่ชนะ',
    match_time DATETIME DEFAULT NULL COMMENT 'เวลาแข่งขัน',
    status ENUM('pending', 'ongoing', 'completed') DEFAULT 'pending',
    stream_url VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. ตาราง token_blacklist (สำหรับ logout)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Index เพื่อเพิ่มประสิทธิภาพ
-- ============================================================
CREATE INDEX idx_teams_status ON teams(status);
CREATE INDEX idx_teams_created_at ON teams(created_at);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_players_family_name ON players(family_name);
CREATE INDEX idx_bracket_round ON bracket(round);
CREATE INDEX idx_bracket_match_number ON bracket(match_number);
CREATE INDEX idx_config_key ON config(config_key);

-- ============================================================
-- ข้อมูลเริ่มต้น (Default Data)
-- ============================================================

-- Admin เริ่มต้น (username: admin, password: admin)
-- แนะนำให้เปลี่ยนรหัสผ่านหลังจากติดตั้ง
INSERT INTO admins (username, password, name) VALUES 
('admin', 'admin', 'Administrator') ON DUPLICATE KEY UPDATE username = username;

-- การตั้งค่าเริ่มต้น
INSERT INTO config (config_key, config_value, description) VALUES
('tournament_name', 'Arena of Arsha Tournament 2026', 'ชื่อการแข่งขัน'),
('tournament_date', '2026-05-10', 'วันที่จัดการแข่งขัน'),
('tournament_time', '13:00', 'เวลาเริ่มแข่งขัน'),
('location', 'Online', 'สถานที่จัดการแข่งขัน'),
('registration_open', 'true', 'สถานะเปิดรับสมัคร (true/false)'),
('registration_start', '2026-04-19 16:00:00', 'วันเวลาเปิดรับสมัคร'),
('registration_end', '2026-04-25 23:59:59', 'วันเวลาปิดรับสมัคร'),
('max_teams', '32', 'จำนวนทีมสูงสุดที่รับสมัคร'),
('stream_url', 'https://twitch.tv/nhon_thestar', 'ลิงก์ถ่ายทอดสด'),
('prize_first', '20000', 'รางวัลที่ 1 (บาท)'),
('prize_second', '10000', 'รางวัลที่ 2 (บาท)'),
('prize_third', '7000', 'รางวัลที่ 3 (บาท)'),
('prize_fourth', '5000', 'รางวัลที่ 4 (บาท)'),
('discord_invite', 'https://discord.gg/Zxjj8FCRe9', 'ลิงก์ Discord Server')
ON DUPLICATE KEY UPDATE config_key = config_key;
