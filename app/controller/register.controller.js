const mysqli = require('../config/mysqli.config');

const getApprovedTeamsCount = async (conn) => {
  const [rows] = await conn.query(
    'SELECT COUNT(*) as count FROM teams WHERE status = ?',
    ['approved']
  );

  return rows[0]?.count || 0;
};

module.exports = {
  // สมัครทีมเข้าแข่งขัน
  register: async (req, res) => {
    const conn = await mysqli.getConnection();

    try {
      const { team_name, players, agree_discord, agree_rules, agree_live } = req.body;

      // Validation
      if (!team_name || !players || !Array.isArray(players) || players.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ต้องมีผู้เล่น 2 คน)'
        });
      }

      // ตรวจสอบว่ายอมรับเงื่อนไขทั้ง 3 รายการ
      if (!agree_discord || !agree_rules || !agree_live) {
        return res.status(400).json({
          success: false,
          message: 'กรุณายอมรับเงื่อนไขทั้งหมดก่อนสมัคร (เข้าร่วม Discord, ยอมรับกติกา, และยินยอมถ่ายทอดสด)'
        });
      }

      // ตรวจสอบว่าเปิดรับสมัครอยู่หรือไม่
      const [configRows] = await conn.query(
        'SELECT config_value FROM config WHERE config_key = ?',
        ['registration_open']
      );

      if (configRows.length > 0 && configRows[0].config_value === 'false') {
        return res.status(400).json({
          success: false,
          message: 'ปิดรับสมัครแล้ว'
        });
      }

      const [maxRows] = await conn.query(
        'SELECT config_value FROM config WHERE config_key = ?',
        ['max_teams']
      );

      const maxTeams = parseInt(maxRows[0]?.config_value || '32', 10);

      // ตรวจสอบจำนวนทีมที่อนุมัติแล้ว
      const approvedCount = await getApprovedTeamsCount(conn);
      if (approvedCount >= maxTeams) {
        return res.status(400).json({
          success: false,
          message: 'ปิดรับสมัครแล้ว (ทีมเข้าแข่งขันครบจำนวน 32 ทีม)'
        });
      }

      // เริ่ม transaction
      await conn.beginTransaction();

      // เช็คชื่อทีมซ้ำ
      const [existingTeams] = await conn.query(
        'SELECT id FROM teams WHERE team_name = ?',
        [team_name]
      );

      if (existingTeams.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: 'ชื่อทีมนี้มีผู้ใช้แล้ว'
        });
      }

      // สร้างทีม
      const [teamResult] = await conn.query(
        `INSERT INTO teams (team_name, status, agree_discord, agree_rules, agree_live) 
         VALUES (?, 'pending', ?, ?, ?)`,
        [team_name, agree_discord ? 1 : 0, agree_rules ? 1 : 0, agree_live ? 1 : 0]
      );

      const teamId = teamResult.insertId;

      // เพิ่มผู้เล่น 2 คน
      for (let i = 0; i < players.length; i++) {
        const player = players[i];

        if (!player.discord_id || !player.family_name) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `กรุณากรอกข้อมูลผู้เล่นคนที่ ${i + 1} ให้ครบถ้วน (ชื่อตระกูลและ Discord ID)`
          });
        }

        await conn.query(
          `INSERT INTO players (team_id, discord_id, family_name, player_order) 
           VALUES (?, ?, ?, ?)`,
          [
            teamId,
            player.discord_id,
            player.family_name,
            i + 1
          ]
        );
      }

      await conn.commit();

      res.status(201).json({
        success: true,
        message: 'สมัครสำเร็จ รอการตรวจสอบจากทีมงาน',
        data: {
          team_id: teamId,
          team_name: team_name,
          max_teams: maxTeams
        }
      });

    } catch (error) {
      await conn.rollback();
      console.error('Error registering team:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสมัคร'
      });
    } finally {
      conn.release();
    }
  },

  // ดึงข้อมูลการตั้งค่า (สำหรับหน้าสมัคร)
  getConfig: async (req, res) => {
    try {
      const [rows] = await mysqli.query(
        'SELECT config_key, config_value FROM config WHERE config_key IN (?, ?, ?, ?, ?, ?)',
        ['tournament_name', 'tournament_date', 'tournament_time', 'location', 'registration_open', 'max_teams']
      );

      const config = {};
      rows.forEach(row => {
        config[row.config_key] = row.config_value;
      });

      const maxTeams = parseInt(config.max_teams || '32', 10);
      const approvedTeams = await getApprovedTeamsCount(mysqli);

      config.max_teams = maxTeams;
      config.approved_teams = approvedTeams;
      config.remaining_slots = Math.max(maxTeams - approvedTeams, 0);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  }
};
