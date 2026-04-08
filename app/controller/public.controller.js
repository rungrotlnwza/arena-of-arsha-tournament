const mysqli = require('../config/mysqli.config');

module.exports = {
  // ดึงข้อมูลหน้าแรก
  getHomeData: async (req, res) => {
    try {
      // ดึง config
      const [configRows] = await mysqli.query('SELECT * FROM config');
      const config = {};
      configRows.forEach(row => {
        config[row.config_key] = row.config_value;
      });

      // นับจำนวนทีมที่อนุมัติแล้ว
      const [countRows] = await mysqli.query(
        'SELECT COUNT(*) as count FROM teams WHERE status = ?',
        ['approved']
      );

      const approvedTeams = countRows[0].count;
      const maxTeams = parseInt(config.max_teams || '32');

      res.json({
        success: true,
        data: {
          tournament: {
            name: config.tournament_name,
            date: config.tournament_date,
            time: config.tournament_time,
            location: config.location,
            prize_first: config.prize_first,
            prize_second: config.prize_second,
            prize_third: config.prize_third
          },
          registration: {
            open: config.registration_open === 'true',
            start: config.registration_start,
            end: config.registration_end,
            approved_teams: approvedTeams,
            max_teams: maxTeams,
            remaining: maxTeams - approvedTeams
          }
        }
      });

    } catch (error) {
      console.error('Home data error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // ดึงรายชื่อทีมที่อนุมัติแล้ว
  getTeams: async (req, res) => {
    try {
      const [teams] = await mysqli.query(
        `SELECT t.id, t.team_name, t.created_at,
                p1.full_name as player1_name, p1.bdo_name as player1_bdo, p1.family_name as player1_family,
                p2.full_name as player2_name, p2.bdo_name as player2_bdo, p2.family_name as player2_family
         FROM teams t
         LEFT JOIN players p1 ON t.id = p1.team_id AND p1.player_order = 1
         LEFT JOIN players p2 ON t.id = p2.team_id AND p2.player_order = 2
         WHERE t.status = ?
         ORDER BY t.created_at`,
        ['approved']
      );

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

  // ดึงตารางแข่งขัน
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
         ORDER BY 
           FIELD(b.round, 'round_1', 'round_2', 'quarter', 'semi', 'final'),
           b.match_number`
      );

      const rounds = {
        round_1: [],
        round_2: [],
        quarter: [],
        semi: [],
        final: []
      };

      matches.forEach(match => {
        if (!rounds[match.round]) {
          rounds[match.round] = [];
        }

        rounds[match.round].push(match);
      });

      res.json({
        success: true,
        data: rounds
      });

    } catch (error) {
      console.error('Get bracket error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  },

  // ดึงข้อมูลถ่ายทอดสด
  getLiveData: async (req, res) => {
    try {
      const [configRows] = await mysqli.query(
        'SELECT config_key, config_value FROM config WHERE config_key IN (?, ?, ?)',
        ['stream_url', 'tournament_name', 'tournament_date']
      );

      const config = {};
      configRows.forEach(row => {
        config[row.config_key] = row.config_value;
      });

      res.json({
        success: true,
        data: {
          stream_url: config.stream_url || '',
          tournament_name: config.tournament_name,
          tournament_date: config.tournament_date
        }
      });

    } catch (error) {
      console.error('Live data error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    }
  }
};
