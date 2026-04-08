const jwt = require('jsonwebtoken');
const mysqli = require('../config/mysqli.config');
const jwtMiddleware = require('../middleware/jwt.middleware');

const adminTokenAgeMs = 24 * 60 * 60 * 1000;
const adminTokenExpiresIn = '24h';
const isSecureCookie = process.env.SECURE === 'production';

const getAdminCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isSecureCookie,
  maxAge: adminTokenAgeMs
});

const getRoundSortValue = (round) => {
  if (!round) {
    return 9999;
  }

  if (round.startsWith('round_')) {
    const parsedRound = parseInt(round.split('_')[1], 10);
    return Number.isNaN(parsedRound) ? 999 : parsedRound;
  }

  if (round === 'quarter') {
    return 1000;
  }

  if (round === 'semi') {
    return 1001;
  }

  if (round === 'final') {
    return 1002;
  }

  return 9000;
};

const sortBracketMatches = (matches) => {
  return matches.sort((left, right) => {
    const roundDiff = getRoundSortValue(left.round) - getRoundSortValue(right.round);

    if (roundDiff !== 0) {
      return roundDiff;
    }

    return (left.match_number || 0) - (right.match_number || 0);
  });
};

const buildRoundSequence = (firstRoundMatchCount) => {
  if (!firstRoundMatchCount) {
    return [];
  }

  const rounds = [{
    key: 'round_1',
    matchCount: firstRoundMatchCount
  }];

  let currentRoundNumber = 1;
  let currentMatchCount = firstRoundMatchCount;

  while (currentMatchCount > 1) {
    const nextMatchCount = Math.ceil(currentMatchCount / 2);
    let nextRoundKey = 'final';

    if (nextMatchCount === 4) {
      nextRoundKey = 'quarter';
    } else if (nextMatchCount === 2) {
      nextRoundKey = 'semi';
    } else if (nextMatchCount > 1) {
      currentRoundNumber += 1;
      nextRoundKey = `round_${currentRoundNumber}`;
    }

    rounds.push({
      key: nextRoundKey,
      matchCount: nextMatchCount
    });

    currentMatchCount = nextMatchCount;
  }

  return rounds;
};

const getNextRoundKey = (round, firstRoundMatchCount) => {
  const rounds = buildRoundSequence(firstRoundMatchCount);
  const currentIndex = rounds.findIndex(item => item.key === round);

  if (currentIndex === -1 || currentIndex === rounds.length - 1) {
    return null;
  }

  return rounds[currentIndex + 1].key;
};

const normalizeBracketId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const normalizeBracketText = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
};

const normalizeBracketStatus = (status, winnerId) => {
  if (winnerId) {
    return 'completed';
  }

  let safeStatus = 'pending';

  if (status === 'ongoing' || status === 'completed') {
    safeStatus = status;
  }

  if (!winnerId && safeStatus === 'completed') {
    return 'pending';
  }

  return safeStatus;
};

const getFirstRoundMatchCount = async (conn) => {
  const [rows] = await conn.query(
    'SELECT COALESCE(MAX(match_number), 0) as match_count FROM bracket WHERE round = ?',
    ['round_1']
  );

  return rows[0]?.match_count || 0;
};

const bracketSelectSql = `
  SELECT b.*,
         t1.team_name as team1_name,
         t2.team_name as team2_name,
         tw.team_name as winner_name
  FROM bracket b
  LEFT JOIN teams t1 ON b.team1_id = t1.id
  LEFT JOIN teams t2 ON b.team2_id = t2.id
  LEFT JOIN teams tw ON b.winner_id = tw.id
`;

const getBracketMatches = async (conn) => {
  const [matches] = await conn.query(bracketSelectSql);
  return sortBracketMatches(matches);
};

const getBracketMatchesByIds = async (conn, ids) => {
  if (!ids.length) {
    return [];
  }

  const [matches] = await conn.query(
    `${bracketSelectSql} WHERE b.id IN (?)`,
    [ids]
  );

  return sortBracketMatches(matches);
};

const syncNextRoundMatch = async (conn, match, firstRoundMatchCount, affectedMatchIds = new Set()) => {
  const nextRoundKey = getNextRoundKey(match.round, firstRoundMatchCount);

  if (!nextRoundKey) {
    return;
  }

  const nextMatchNumber = Math.ceil(match.match_number / 2);
  const targetField = match.match_number % 2 === 1 ? 'team1_id' : 'team2_id';
  const [nextRoundRows] = await conn.query(
    'SELECT * FROM bracket WHERE round = ? AND match_number = ? LIMIT 1',
    [nextRoundKey, nextMatchNumber]
  );

  let nextRoundMatch = nextRoundRows[0] || null;

  if (!nextRoundMatch && !match.winner_id) {
    return;
  }

  if (!nextRoundMatch) {
    const initialTeam1Id = targetField === 'team1_id' ? match.winner_id : null;
    const initialTeam2Id = targetField === 'team2_id' ? match.winner_id : null;
    const [insertResult] = await conn.query(
      `INSERT INTO bracket (round, match_number, team1_id, team2_id, status)
       VALUES (?, ?, ?, ?, ?)`,
      [nextRoundKey, nextMatchNumber, initialTeam1Id, initialTeam2Id, 'pending']
    );

    const [insertedRows] = await conn.query(
      'SELECT * FROM bracket WHERE id = ?',
      [insertResult.insertId]
    );

    nextRoundMatch = insertedRows[0];
  }

  const nextTeam1Id = targetField === 'team1_id' ? match.winner_id : nextRoundMatch.team1_id;
  const nextTeam2Id = targetField === 'team2_id' ? match.winner_id : nextRoundMatch.team2_id;
  let nextWinnerId = nextRoundMatch.winner_id;
  let nextStatus = nextRoundMatch.status;

  if (nextWinnerId && nextWinnerId !== nextTeam1Id && nextWinnerId !== nextTeam2Id) {
    nextWinnerId = null;
    nextStatus = 'pending';
  }

  await conn.query(
    `UPDATE bracket
     SET team1_id = ?, team2_id = ?, winner_id = ?, status = ?
     WHERE id = ?`,
    [nextTeam1Id, nextTeam2Id, nextWinnerId, nextStatus, nextRoundMatch.id]
  );

  affectedMatchIds.add(nextRoundMatch.id);

  await syncNextRoundMatch(conn, {
    ...nextRoundMatch,
    team1_id: nextTeam1Id,
    team2_id: nextTeam2Id,
    winner_id: nextWinnerId,
    status: nextStatus
  }, firstRoundMatchCount, affectedMatchIds);
};

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

      const token = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: adminTokenExpiresIn }
      );

      res.cookie('token', token, getAdminCookieOptions());

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
    const token = jwtMiddleware.getToken(req);
    jwtMiddleware.revokeToken(token);
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureCookie
    });
    res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  },

  // Check Auth Status
  checkAuth: (req, res) => {
    const token = jwtMiddleware.getToken(req);

    if (!token || jwtMiddleware.isRevoked(token)) {
      res.json({
        success: true,
        isAuthenticated: false
      });
      return;
    }

    try {
      const user = jwtMiddleware.verify(token);

      if (user.role !== 'admin') {
        res.json({
          success: true,
          isAuthenticated: false
        });
        return;
      }

      res.json({
        success: true,
        isAuthenticated: true,
        adminName: user.name || user.username || 'Admin'
      });
    } catch (error) {
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
                p1.family_name as player1_name, 
                p2.family_name as player2_name
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
               p1.family_name as player1_name, p1.discord_id as player1_discord,
               p1.bdo_name as player1_bdo, p1.family_name as player1_family,
               p2.family_name as player2_name, p2.discord_id as player2_discord,
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
      const [maxTeamsRow] = await mysqli.query(
        'SELECT config_value FROM config WHERE config_key = ?',
        ['max_teams']
      );
      const matches = await getBracketMatches(mysqli);
      const parsedMaxTeams = parseInt(maxTeamsRow[0]?.config_value || '32', 10);
      const maxTeams = Number.isNaN(parsedMaxTeams) || parsedMaxTeams < 1 ? 32 : parsedMaxTeams;

      res.json({
        success: true,
        data: matches,
        meta: {
          initial_round_1_match_count: Math.max(1, Math.ceil(maxTeams / 2))
        }
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
      const team1Id = normalizeBracketId(req.body.team1_id);
      const team2Id = normalizeBracketId(req.body.team2_id);
      let winnerId = normalizeBracketId(req.body.winner_id);
      const matchTime = normalizeBracketText(req.body.match_time);
      const streamUrl = normalizeBracketText(req.body.stream_url);
      const notes = normalizeBracketText(req.body.notes);
      const requestedRound = req.body.round;
      const requestedMatchNumber = normalizeBracketId(req.body.match_number);
      const affectedMatchIds = new Set();

      await conn.beginTransaction();

      const firstRoundMatchCount = await getFirstRoundMatchCount(conn);
      let matchRecord = null;

      if (id === 'new') {
        if (!requestedRound) {
          await conn.rollback();
          res.status(400).json({
            success: false,
            message: 'ไม่พบรอบการแข่งขัน'
          });
          return;
        }

        let nextMatchNumber = requestedMatchNumber;

        if (!nextMatchNumber) {
          const [lastMatch] = await conn.query(
            'SELECT match_number FROM bracket WHERE round = ? ORDER BY match_number DESC LIMIT 1',
            [requestedRound]
          );
          nextMatchNumber = (lastMatch[0]?.match_number || 0) + 1;
        }

        const [existingSlotRows] = await conn.query(
          'SELECT * FROM bracket WHERE round = ? AND match_number = ? LIMIT 1',
          [requestedRound, nextMatchNumber]
        );
        const safeWinnerId = winnerId && (winnerId === team1Id || winnerId === team2Id) ? winnerId : null;
        const safeStatus = normalizeBracketStatus(req.body.status, safeWinnerId);

        if (existingSlotRows.length > 0) {
          const existingMatch = existingSlotRows[0];

          await conn.query(
            `UPDATE bracket 
             SET team1_id = ?, team2_id = ?, winner_id = ?, match_time = ?, status = ?, stream_url = ?, notes = ?
             WHERE id = ?`,
            [team1Id, team2Id, safeWinnerId, matchTime, safeStatus, streamUrl, notes, existingMatch.id]
          );

          matchRecord = {
            ...existingMatch,
            id: existingMatch.id,
            round: existingMatch.round,
            match_number: existingMatch.match_number,
            team1_id: team1Id,
            team2_id: team2Id,
            winner_id: safeWinnerId,
            status: safeStatus
          };
        } else {
          const [insertResult] = await conn.query(
            `INSERT INTO bracket (round, match_number, team1_id, team2_id, winner_id, match_time, status, stream_url, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [requestedRound, nextMatchNumber, team1Id, team2Id, safeWinnerId, matchTime, safeStatus, streamUrl, notes]
          );

          matchRecord = {
            id: insertResult.insertId,
            round: requestedRound,
            match_number: nextMatchNumber,
            team1_id: team1Id,
            team2_id: team2Id,
            winner_id: safeWinnerId,
            status: safeStatus
          };
        }
      } else {
        const [existingRows] = await conn.query(
          'SELECT * FROM bracket WHERE id = ? LIMIT 1',
          [id]
        );

        if (existingRows.length === 0) {
          await conn.rollback();
          res.status(404).json({
            success: false,
            message: 'ไม่พบคู่แข่งขัน'
          });
          return;
        }

        const existingMatch = existingRows[0];
        const safeWinnerId = winnerId && (winnerId === team1Id || winnerId === team2Id) ? winnerId : null;
        const safeStatus = normalizeBracketStatus(req.body.status, safeWinnerId);

        await conn.query(
          `UPDATE bracket 
           SET team1_id = ?, team2_id = ?, winner_id = ?, match_time = ?, status = ?, stream_url = ?, notes = ?
           WHERE id = ?`,
          [team1Id, team2Id, safeWinnerId, matchTime, safeStatus, streamUrl, notes, id]
        );

        matchRecord = {
          ...existingMatch,
          id: existingMatch.id,
          round: existingMatch.round,
          match_number: existingMatch.match_number,
          team1_id: team1Id,
          team2_id: team2Id,
          winner_id: safeWinnerId,
          status: safeStatus
        };
      }

      affectedMatchIds.add(matchRecord.id);
      await syncNextRoundMatch(conn, matchRecord, firstRoundMatchCount || matchRecord.match_number, affectedMatchIds);
      await conn.commit();
      const updatedMatches = await getBracketMatchesByIds(conn, Array.from(affectedMatchIds));

      res.json({
        success: true,
        message: 'บันทึกสำเร็จ',
        data: {
          updated_matches: updatedMatches
        }
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
    const conn = await mysqli.getConnection();

    try {
      const { id } = req.params;
      await conn.beginTransaction();
      const [matchRows] = await conn.query(
        'SELECT * FROM bracket WHERE id = ? LIMIT 1',
        [id]
      );

      if (matchRows.length === 0) {
        await conn.rollback();
        res.status(404).json({
          success: false,
          message: 'ไม่พบคู่แข่งขัน'
        });
        return;
      }

      const firstRoundMatchCount = await getFirstRoundMatchCount(conn);
      const match = matchRows[0];
      const affectedMatchIds = new Set();

      await conn.query('DELETE FROM bracket WHERE id = ?', [id]);
      await syncNextRoundMatch(conn, {
        ...match,
        winner_id: null,
        status: 'pending'
      }, firstRoundMatchCount, affectedMatchIds);
      await conn.commit();
      const updatedMatches = await getBracketMatchesByIds(conn, Array.from(affectedMatchIds));

      res.json({
        success: true,
        message: 'ลบสำเร็จ',
        data: {
          deleted_match_id: parseInt(id, 10),
          updated_matches: updatedMatches
        }
      });

    } catch (error) {
      await conn.rollback();
      console.error('Delete bracket error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    } finally {
      conn.release();
    }
  },

  // Reset Bracket Pairings
  resetBracket: async (req, res) => {
    const conn = await mysqli.getConnection();
    let hasTransaction = false;

    try {
      await conn.beginTransaction();
      hasTransaction = true;
      await conn.query('DELETE FROM bracket');

      await conn.commit();
      hasTransaction = false;
      const matches = await getBracketMatches(conn);

      res.json({
        success: true,
        message: 'รีเซ็ตการจับคู่ทั้งหมดสำเร็จ',
        data: {
          matches: matches
        }
      });

    } catch (error) {
      if (hasTransaction) {
        await conn.rollback();
      }

      console.error('Reset bracket error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    } finally {
      conn.release();
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
      const matches = await getBracketMatches(conn);

      res.json({
        success: true,
        message: 'สร้างตารางแข่งขันสำเร็จ',
        data: {
          matches: matches
        }
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
