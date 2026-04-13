-- ============================================
-- Arena of Arsha Tournament 2026 - Database
-- ============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database
CREATE DATABASE IF NOT EXISTS Arsha2026 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE Arsha2026;

-- ============================================
-- 1. Config Table (ตั้งค่าการแข่งขัน)
-- ============================================
CREATE TABLE config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value VARCHAR(255),
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ค่าเริ่มต้น
INSERT INTO config VALUES 
('tournament_name', 'Arena of Arsha Tournament 2026', 'ชื่อกิจกรรม'),
('tournament_date', '2026-04-20', 'วันที่แข่งขัน (YYYY-MM-DD)'),
('tournament_time', '19:00', 'เวลาแข่งขัน (HH:MM)'),
('location', 'Online', 'สถานที่'),
('registration_start', '2026-04-01 00:00:00', 'วันเวลาเปิดรับสมัคร'),
('registration_end', '2026-04-15 23:59:59', 'วันเวลาปิดรับสมัคร'),
('max_teams', '32', 'จำนวนทีมสูงสุด'),
('registration_open', 'true', 'สถานะการรับสมัคร (true/false)'),
('stream_url', '', 'ลิงก์ถ่ายทอดสด'),
('prize_first', '20000', 'รางวัลที่ 1'),
('prize_second', '12000', 'รางวัลที่ 2'),
('prize_third', '8000', 'รางวัลที่ 3');

-- ============================================
-- 2. Admins Table
-- ============================================
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin
INSERT INTO admins (username, password, name) VALUES
('admin', 'admin123', 'ผู้ดูแลระบบ');

-- ============================================
-- 3. Teams Table
-- ============================================
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    experience TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    referral VARCHAR(50),
    agree_live BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Players Table (2 คนต่อทีม)
-- ============================================
CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    full_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    discord_id VARCHAR(50) NOT NULL,
    bdo_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    family_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    player_order TINYINT NOT NULL COMMENT '1 = ผู้เล่นคนแรก, 2 = คนที่สอง',
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Bracket Table (ตารางแข่งขัน)
-- ============================================
CREATE TABLE bracket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    round VARCHAR(20) NOT NULL COMMENT 'รอบการแข่งขัน (round_1, quarter, semi, final)',
    match_number INT NOT NULL COMMENT 'เลขคู่แข่งขันในรอบนั้น',
    team1_id INT NULL COMMENT 'ทีมฝั่งที่ 1 (null = ยังไม่จับคู่)',
    team2_id INT NULL COMMENT 'ทีมฝั่งที่ 2 (null = ยังไม่จับคู่ หรือบาย)',
    team1_score INT NULL COMMENT 'คะแนนทีมฝั่งที่ 1',
    team2_score INT NULL COMMENT 'คะแนนทีมฝั่งที่ 2',
    winner_id INT NULL COMMENT 'ทีมที่ชนะ (null = ยังไม่แข่ง)',
    match_time DATETIME NULL COMMENT 'เวลาแข่งขัน (ถ้ากำหนด)',
    status ENUM('pending', 'ongoing', 'completed') DEFAULT 'pending',
    stream_url VARCHAR(255) COMMENT 'ลิงก์ถ่ายทอดสดคู่นี้ (ถ้ามี)',
    notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'หมายเหตุ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team1_id) REFERENCES teams(id),
    FOREIGN KEY (team2_id) REFERENCES teams(id),
    FOREIGN KEY (winner_id) REFERENCES teams(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
