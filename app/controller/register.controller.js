const mysqli = require('../config/mysqli.config');

module.exports = {
  // สมัครทีมเข้าแข่งขัน
  register: async (req, res) => {
    const conn = await mysqli.getConnection();
    
    try {
      const { team_name, players, experience, referral, agree_live } = req.body;

      // Validation
      if (!team_name || !players || !Array.isArray(players) || players.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ต้องมีผู้เล่น 2 คน)'
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

      // ตรวจสอบจำนวนทีม
      const [countRows] = await conn.query(
        'SELECT COUNT(*) as count FROM teams WHERE status = ?',
        ['approved']
      );
      
      const [maxRows] = await conn.query(
        'SELECT config_value FROM config WHERE config_key = ?',
        ['max_teams']
      );
      
      const currentTeams = countRows[0].count;
      const maxTeams = parseInt(maxRows[0]?.config_value || '32');
      
      if (currentTeams >= maxTeams) {
        return res.status(400).json({
          success: false,
          message: 'ทีมเต็มแล้ว'
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
        `INSERT INTO teams (team_name, status, experience, referral, agree_live) 
         VALUES (?, 'pending', ?, ?, ?)`,
        [team_name, experience || null, referral || null, agree_live ? 1 : 0]
      );

      const teamId = teamResult.insertId;

      // เพิ่มผู้เล่น 2 คน
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        
        if (!player.full_name || !player.discord_id || !player.bdo_name || !player.family_name) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `กรุณากรอกข้อมูลผู้เล่นคนที่ ${i + 1} ให้ครบถ้วน`
          });
        }

        await conn.query(
          `INSERT INTO players (team_id, full_name, discord_id, bdo_name, family_name, player_order) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            teamId,
            player.full_name,
            player.discord_id,
            player.bdo_name,
            player.family_name,
            i + 1
          ]
        );
      }

      await conn.commit();

      res.status(201).json({
        success: true,
        message: 'สมัครสำเร็จ',
        data: {
          team_id: teamId,
          team_name: team_name
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
        'SELECT config_key, config_value FROM config WHERE config_key IN (?, ?, ?, ?, ?)',
        ['tournament_name', 'tournament_date', 'tournament_time', 'location', 'registration_open']
      );
      
      const config = {};
      rows.forEach(row => {
        config[row.config_key] = row.config_value;
      });

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
