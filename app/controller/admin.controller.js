const mysqli = require('../config/mysqli.config');

module.exports = {
  // Admin Login
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอก username และ password'
        });
      }

      const [rows] = await mysqli.query(
        'SELECT * FROM admins WHERE username = ?',
        [username]
      );

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'username หรือ password ไม่ถูกต้อง'
        });
      }

      const admin = rows[0];

      // Plain text password comparison (as per project requirements)
      if (password !== admin.password) {
        return res.status(401).json({
          success: false,
          message: 'username หรือ password ไม่ถูกต้อง'
        });
      }

      // Create session
      req.session.adminId = admin.id;
      req.session.adminName = admin.name;

      res.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        data: {
          name: admin.name
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // Logout
  logout: (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  },

  // Check Auth Status
  checkAuth: (req, res) => {
    if (req.session && req.session.adminId) {
      res.json({
        success: true,
        isAuthenticated: true,
        adminName: req.session.adminName
      });
    } else {
      res.json({
        success: true,
        isAuthenticated: false
      });
    }
  },

  // Get Dashboard Stats
  getDashboard: async (req, res) => {
    try {
      // Total teams
      const [totalTeams] = await mysqli.query(
        'SELECT COUNT(*) as count FROM teams'
      );

      // Approved teams
      const [approvedTeams] = await mysqli.query(
        'SELECT COUNT(*) as count FROM teams WHERE status = ?',
        ['approved']
      );

      // Pending teams
      const [pendingTeams] = await mysqli.query(
        'SELECT COUNT(*) as count FROM teams WHERE status = ?',
        ['pending']
      );

      // Max teams from config
      const [maxTeamsRow] = await mysqli.query(
        'SELECT config_value FROM config WHERE config_key = ?',
        ['max_teams']
      );
      const maxTeams = parseInt(maxTeamsRow[0]?.config_value || '32');

      // Recent teams (last 5)
      const [recentTeams] = await mysqli.query(
        `SELECT t.*, 
                p1.full_name as player1_name, 
                p2.full_name as player2_name
         FROM teams t
         LEFT JOIN players p1 ON t.id = p1.team_id AND p1.player_order = 1
         LEFT JOIN players p2 ON t.id = p2.team_id AND p2.player_order = 2
         ORDER BY t.created_at DESC
         LIMIT 5`
      );

      res.json({
        success: true,
        data: {
          stats: {
            total: totalTeams[0].count,
            approved: approvedTeams[0].count,
            pending: pendingTeams[0].count,
            remaining: maxTeams - approvedTeams[0].count,
            maxTeams: maxTeams
          },
          recentTeams: recentTeams
        }
      });

    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // Get All Teams
  getTeams: async (req, res) => {
    try {
      const { status } = req.query;
      
      let sql = `
        SELECT t.*, 
               p1.full_name as player1_name, p1.discord_id as player1_discord,
               p1.bdo_name as player1_bdo, p1.family_name as player1_family,
               p2.full_name as player2_name, p2.discord_id as player2_discord,
               p2.bdo_name as player2_bdo, p2.family_name as player2_family
        FROM teams t
        LEFT JOIN players p1 ON t.id = p1.team_id AND p1.player_order = 1
        LEFT JOIN players p2 ON t.id = p2.team_id AND p2.player_order = 2
      `;
      
      const params = [];
      if (status) {
        sql += ' WHERE t.status = ?';
        params.push(status);
      }
      
      sql += ' ORDER BY t.created_at DESC';

      const [teams] = await mysqli.query(sql, params);

      res.json({
        success: true,
        data: teams
      });

    } catch (error) {
      console.error('Get teams error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // Update Team Status
  updateTeamStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'สถานะไม่ถูกต้อง'
        });
      }

      await mysqli.query(
        'UPDATE teams SET status = ? WHERE id = ?',
        [status, id]
      );

      res.json({
        success: true,
        message: 'อัปเดตสถานะสำเร็จ'
      });

    } catch (error) {
      console.error('Update team status error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // Get Config
  getConfig: async (req, res) => {
    try {
      const [rows] = await mysqli.query('SELECT * FROM config');
      
      const config = {};
      rows.forEach(row => {
        config[row.config_key] = row.config_value;
      });

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('Get config error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // Update Config
  updateConfig: async (req, res) => {
    try {
      const updates = req.body;

      for (const [key, value] of Object.entries(updates)) {
        await mysqli.query(
          'UPDATE config SET config_value = ? WHERE config_key = ?',
          [value, key]
        );
      }

      res.json({
        success: true,
        message: 'บันทึกการตั้งค่าสำเร็จ'
      });

    } catch (error) {
      console.error('Update config error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // Get Bracket
  getBracket: async (req, res) => {
    try {
      const [matches] = await mysqli.query(
        `SELECT b.*,
                t1.team_name as team1_name,
                t2.team_name as team2_name,
                tw.team_name as winner_name
         FROM bracket b
         LEFT JOIN teams t1 ON b.team1_id = t1.id
         LEFT JOIN teams t2 ON b.team2_id = t2.id
         LEFT JOIN teams tw ON b.winner_id = tw.id
         ORDER BY b.round, b.match_number`
      );

      res.json({
        success: true,
        data: matches
      });

    } catch (error) {
      console.error('Get bracket error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // Create/Update Bracket Match
  saveBracketMatch: async (req, res) => {
    const conn = await mysqli.getConnection();
    
    try {
      const { id } = req.params;
      const { team1_id, team2_id, winner_id, match_time, status, stream_url, notes } = req.body;

      await conn.beginTransaction();

      if (id === 'new') {
        // Create new match - need to calculate round and match_number
        const [lastMatch] = await conn.query(
          'SELECT match_number FROM bracket WHERE round = ? ORDER BY match_number DESC LIMIT 1',
          [req.body.round]
        );
        const nextMatchNumber = (lastMatch[0]?.match_number || 0) + 1;

        await conn.query(
          `INSERT INTO bracket (round, match_number, team1_id, team2_id, winner_id, match_time, status, stream_url, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.body.round, nextMatchNumber, team1_id, team2_id, winner_id, match_time, status, stream_url, notes]
        );
      } else {
        // Update existing match
        await conn.query(
          `UPDATE bracket 
           SET team1_id = ?, team2_id = ?, winner_id = ?, match_time = ?, status = ?, stream_url = ?, notes = ?
           WHERE id = ?`,
          [team1_id, team2_id, winner_id, match_time, status, stream_url, notes, id]
        );
      }

      await conn.commit();

      res.json({
        success: true,
        message: 'บันทึกสำเร็จ'
      });

    } catch (error) {
      await conn.rollback();
      console.error('Save bracket error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    } finally {
      conn.release();
    }
  },

  // Delete Bracket Match
  deleteBracketMatch: async (req, res) => {
    try {
      const { id } = req.params;

      await mysqli.query('DELETE FROM bracket WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'ลบสำเร็จ'
      });

    } catch (error) {
      console.error('Delete bracket error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // Generate Bracket Automatically
  generateBracket: async (req, res) => {
    const conn = await mysqli.getConnection();
    
    try {
      // Get approved teams
      const [teams] = await conn.query(
        'SELECT id FROM teams WHERE status = ? ORDER BY created_at',
        ['approved']
      );

      if (teams.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'ต้องมีทีมที่อนุมัติแล้วอย่างน้อย 2 ทีม'
        });
      }

      await conn.beginTransaction();

      // Clear existing bracket
      await conn.query('DELETE FROM bracket');

      // Calculate number of matches in first round
      const numTeams = teams.length;
      const numMatches = Math.ceil(numTeams / 2);

      // Create round 1 matches
      for (let i = 0; i < numMatches; i++) {
        const team1_id = teams[i * 2]?.id || null;
        const team2_id = teams[i * 2 + 1]?.id || null;

        await conn.query(
          `INSERT INTO bracket (round, match_number, team1_id, team2_id, status)
           VALUES (?, ?, ?, ?, ?)`,
          ['round_1', i + 1, team1_id, team2_id, 'pending']
        );
      }

      await conn.commit();

      res.json({
        success: true,
        message: 'สร้างตารางแข่งขันสำเร็จ'
      });

    } catch (error) {
      await conn.rollback();
      console.error('Generate bracket error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    } finally {
      conn.release();
    }
  }
};
