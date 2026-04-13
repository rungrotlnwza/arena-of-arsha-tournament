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
    if (currentMatchCount === 4) {
      rounds.push({
        key: 'semi',
        matchCount: 6
      });
      rounds.push({
        key: 'final',
        matchCount: 2
      });
      break;
    }

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

const getPreviousRoundKey = (round, firstRoundMatchCount) => {
  const rounds = buildRoundSequence(firstRoundMatchCount);
  const currentIndex = rounds.findIndex(item => item.key === round);

  if (currentIndex <= 0) {
    return null;
  }

  return rounds[currentIndex - 1].key;
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

const normalizeBracketScore = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
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

const validateBracketScores = (round, team1Id, team2Id, team1Score, team2Score) => {
  const hasTeam1Score = team1Score !== null;
  const hasTeam2Score = team2Score !== null;

  if (hasTeam1Score !== hasTeam2Score) {
    return 'กรุณากรอกคะแนนของทั้งสองทีมให้ครบ';
  }

  const scores = [team1Score, team2Score].filter(score => score !== null);
  const hasInvalidScore = scores.some(score => score < 0 || score > 10);

  if (hasInvalidScore) {
    return 'คะแนนต้องอยู่ระหว่าง 0 ถึง 10';
  }

  if (scores.length && (!team1Id || !team2Id)) {
    return 'ต้องมีทีมครบทั้งสองฝั่งก่อนจึงจะบันทึกคะแนนได้';
  }

  if (round !== 'semi' && team1Score !== null && team2Score !== null && team1Score === team2Score) {
    return 'รอบแพ้คัดออกไม่สามารถเสมอกันได้';
  }

  return null;
};

const resolveBracketOutcome = ({
  round,
  team1Id,
  team2Id,
  requestedWinnerId,
  requestedStatus,
  team1Score,
  team2Score
}) => {
  let safeWinnerId = requestedWinnerId && (requestedWinnerId === team1Id || requestedWinnerId === team2Id)
    ? requestedWinnerId
    : null;
  let safeStatus = normalizeBracketStatus(requestedStatus, safeWinnerId);

  if (team1Score === null || team2Score === null) {
    return {
      safeWinnerId: safeWinnerId,
      safeStatus: safeStatus
    };
  }

  if (round === 'semi') {
    if (team1Score > team2Score) {
      safeWinnerId = team1Id;
    } else if (team2Score > team1Score) {
      safeWinnerId = team2Id;
    } else {
      safeWinnerId = null;
    }

    return {
      safeWinnerId: safeWinnerId,
      safeStatus: 'completed'
    };
  }

  if (!safeWinnerId) {
    safeWinnerId = team1Score > team2Score ? team1Id : team2Id;
  }

  return {
    safeWinnerId: safeWinnerId,
    safeStatus: 'completed'
  };
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

const teamPlayerSummaryJoinSql = `
  LEFT JOIN (
    SELECT team_id,
           MAX(CASE WHEN player_order = 1 THEN family_name END) as player1_name,
           MAX(CASE WHEN player_order = 1 THEN discord_id END) as player1_discord,
           MAX(CASE WHEN player_order = 2 THEN family_name END) as player2_name,
           MAX(CASE WHEN player_order = 2 THEN discord_id END) as player2_discord
    FROM players
    GROUP BY team_id
  ) player_summary ON t.id = player_summary.team_id
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

const normalizeScoredMatches = async (conn, affectedMatchIds = new Set()) => {
  const [rows] = await conn.query(
    `SELECT *
     FROM bracket
     WHERE team1_id IS NOT NULL
       AND team2_id IS NOT NULL
       AND team1_score IS NOT NULL
       AND team2_score IS NOT NULL`
  );

  for (const row of rows) {
    const resolvedOutcome = resolveBracketOutcome({
      round: row.round,
      team1Id: row.team1_id,
      team2Id: row.team2_id,
      requestedWinnerId: row.winner_id,
      requestedStatus: row.status,
      team1Score: row.team1_score,
      team2Score: row.team2_score
    });

    if ((row.winner_id || null) === (resolvedOutcome.safeWinnerId || null) && row.status === resolvedOutcome.safeStatus) {
      continue;
    }

    await conn.query(
      `UPDATE bracket
       SET winner_id = ?, status = ?
       WHERE id = ?`,
      [resolvedOutcome.safeWinnerId, resolvedOutcome.safeStatus, row.id]
    );

    affectedMatchIds.add(row.id);
  }
};

const buildSemiRoundRobinMatches = (teamIds) => {
  if (teamIds.length !== 4) {
    return [];
  }

  return [
    { match_number: 1, team1_id: teamIds[0], team2_id: teamIds[1] },
    { match_number: 2, team1_id: teamIds[2], team2_id: teamIds[3] },
    { match_number: 3, team1_id: teamIds[0], team2_id: teamIds[2] },
    { match_number: 4, team1_id: teamIds[1], team2_id: teamIds[3] },
    { match_number: 5, team1_id: teamIds[0], team2_id: teamIds[3] },
    { match_number: 6, team1_id: teamIds[1], team2_id: teamIds[2] }
  ];
};

const getSemiQualifiedTeams = async (conn, firstRoundMatchCount) => {
  const feederRoundKey = getPreviousRoundKey('semi', firstRoundMatchCount);
  const rounds = buildRoundSequence(firstRoundMatchCount);
  const semiRoundIndex = rounds.findIndex(item => item.key === 'semi');
  const feederRound = semiRoundIndex > 0 ? rounds[semiRoundIndex - 1] : null;

  if (!feederRoundKey || !feederRound) {
    return {
      feederRoundKey: null,
      expectedTeamCount: 0,
      teamIds: []
    };
  }

  const [rows] = await conn.query(
    'SELECT match_number, winner_id FROM bracket WHERE round = ? ORDER BY match_number',
    [feederRoundKey]
  );

  const teamIds = rows
    .sort((left, right) => (left.match_number || 0) - (right.match_number || 0))
    .filter(row => row.winner_id)
    .map(row => row.winner_id);

  return {
    feederRoundKey: feederRoundKey,
    expectedTeamCount: feederRound.matchCount,
    teamIds: teamIds
  };
};

const resetRoundMatches = async (conn, roundKey, affectedMatchIds = new Set()) => {
  const [rows] = await conn.query(
    'SELECT id, team1_id, team2_id, team1_score, team2_score, winner_id, status FROM bracket WHERE round = ?',
    [roundKey]
  );

  for (const row of rows) {
    const needsReset = row.team1_id
      || row.team2_id
      || row.team1_score !== null
      || row.team2_score !== null
      || row.winner_id
      || row.status !== 'pending';

    if (!needsReset) {
      continue;
    }

    await conn.query(
      `UPDATE bracket
       SET team1_id = NULL, team2_id = NULL, team1_score = NULL, team2_score = NULL, winner_id = NULL, status = ?
       WHERE id = ?`,
      ['pending', row.id]
    );

    affectedMatchIds.add(row.id);
  }

  return rows.length > 0;
};

const syncSemiRoundRobinMatches = async (conn, firstRoundMatchCount, affectedMatchIds = new Set()) => {
  const semiQualified = await getSemiQualifiedTeams(conn, firstRoundMatchCount);
  const uniqueQualifiedTeamIds = Array.from(new Set(semiQualified.teamIds.map(teamId => String(teamId))));
  const [existingSemiRows] = await conn.query(
    'SELECT * FROM bracket WHERE round = ? ORDER BY match_number',
    ['semi']
  );
  const existingSemiByMatchNumber = new Map(
    existingSemiRows.map(row => [row.match_number, row])
  );
  const canAutoBuildSemi = semiQualified.expectedTeamCount === 4
    && semiQualified.teamIds.length === 4
    && uniqueQualifiedTeamIds.length === 4;
  let didSemiStructureChange = false;

  if (!canAutoBuildSemi) {
    for (const row of existingSemiRows) {
      const needsReset = row.team1_id
        || row.team2_id
        || row.team1_score !== null
        || row.team2_score !== null
        || row.winner_id
        || row.status !== 'pending';

      if (!needsReset) {
        continue;
      }

      await conn.query(
        `UPDATE bracket
         SET team1_id = NULL, team2_id = NULL, team1_score = NULL, team2_score = NULL, winner_id = NULL, status = ?
         WHERE id = ?`,
        ['pending', row.id]
      );

      affectedMatchIds.add(row.id);
      didSemiStructureChange = true;
    }

    await resetRoundMatches(conn, 'final', affectedMatchIds);

    return;
  }

  const semiMatches = buildSemiRoundRobinMatches(semiQualified.teamIds);

  for (const semiMatch of semiMatches) {
    const existingSemiMatch = existingSemiByMatchNumber.get(semiMatch.match_number);

    if (!existingSemiMatch) {
      const [insertResult] = await conn.query(
        `INSERT INTO bracket (round, match_number, team1_id, team2_id, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['semi', semiMatch.match_number, semiMatch.team1_id, semiMatch.team2_id, 'pending']
      );

      affectedMatchIds.add(insertResult.insertId);
      didSemiStructureChange = true;
      continue;
    }

    const didTeamsChange = (existingSemiMatch.team1_id || null) !== semiMatch.team1_id
      || (existingSemiMatch.team2_id || null) !== semiMatch.team2_id;
    const nextTeam1Score = didTeamsChange ? null : existingSemiMatch.team1_score;
    const nextTeam2Score = didTeamsChange ? null : existingSemiMatch.team2_score;
    let nextWinnerId = existingSemiMatch.winner_id;
    let nextStatus = existingSemiMatch.status;

    if (didTeamsChange) {
      nextWinnerId = null;
      nextStatus = 'pending';
    }

    if (nextWinnerId && nextWinnerId !== semiMatch.team1_id && nextWinnerId !== semiMatch.team2_id) {
      nextWinnerId = null;
      nextStatus = 'pending';
    }

    const resolvedOutcome = resolveBracketOutcome({
      round: 'semi',
      team1Id: semiMatch.team1_id,
      team2Id: semiMatch.team2_id,
      requestedWinnerId: nextWinnerId,
      requestedStatus: nextStatus,
      team1Score: nextTeam1Score,
      team2Score: nextTeam2Score
    });
    const didMatchChange = didTeamsChange
      || (existingSemiMatch.team1_score !== nextTeam1Score)
      || (existingSemiMatch.team2_score !== nextTeam2Score)
      || (existingSemiMatch.winner_id || null) !== (resolvedOutcome.safeWinnerId || null)
      || existingSemiMatch.status !== resolvedOutcome.safeStatus;

    if (!didMatchChange) {
      continue;
    }

    await conn.query(
      `UPDATE bracket
       SET team1_id = ?, team2_id = ?, team1_score = ?, team2_score = ?, winner_id = ?, status = ?
       WHERE id = ?`,
      [
        semiMatch.team1_id,
        semiMatch.team2_id,
        nextTeam1Score,
        nextTeam2Score,
        resolvedOutcome.safeWinnerId,
        resolvedOutcome.safeStatus,
        existingSemiMatch.id
      ]
    );

    affectedMatchIds.add(existingSemiMatch.id);
    didSemiStructureChange = true;
  }

  if (didSemiStructureChange) {
    await resetRoundMatches(conn, 'final', affectedMatchIds);
  }
};

const validateSemiTeams = async (conn, team1Id, team2Id, firstRoundMatchCount) => {
  if (!team1Id && !team2Id) {
    return null;
  }

  if (team1Id && team2Id && team1Id === team2Id) {
    return 'ไม่สามารถเลือกทีมซ้ำกันในแมตช์เดียวกันได้';
  }

  const semiQualified = await getSemiQualifiedTeams(conn, firstRoundMatchCount);
  const uniqueQualifiedTeamIds = Array.from(new Set(semiQualified.teamIds.map(teamId => String(teamId))));

  if (semiQualified.expectedTeamCount !== 4 || uniqueQualifiedTeamIds.length !== 4) {
    return 'ยังมีทีมผ่านเข้ารอบ 4 ทีมสุดท้ายไม่ครบ ระบบจะสร้างแมตช์สะสมคะแนนให้อัตโนมัติเมื่อได้ครบ 4 ทีม';
  }

  const invalidTeamId = [team1Id, team2Id]
    .filter(Boolean)
    .find(teamId => !uniqueQualifiedTeamIds.includes(String(teamId)));

  if (invalidTeamId) {
    return 'รอบ 4 ทีมสุดท้ายเลือกได้เฉพาะทีมที่ผ่านรอบ 8 ทีมมาแล้ว';
  }

  return null;
};

const getSemiStandings = (matches) => {
  const standings = new Map();

  matches.forEach(match => {
    if (!match.team1_id || !match.team2_id) {
      return;
    }

    if (!standings.has(match.team1_id)) {
      standings.set(match.team1_id, { team_id: match.team1_id, win_count: 0, total_points: 0, match_count: 0 });
    }

    if (!standings.has(match.team2_id)) {
      standings.set(match.team2_id, { team_id: match.team2_id, win_count: 0, total_points: 0, match_count: 0 });
    }

    if (match.status !== 'completed' || match.team1_score === null || match.team2_score === null) {
      return;
    }

    standings.get(match.team1_id).total_points += match.team1_score;
    standings.get(match.team1_id).match_count += 1;
    standings.get(match.team2_id).total_points += match.team2_score;
    standings.get(match.team2_id).match_count += 1;

    if (match.winner_id === match.team1_id) {
      standings.get(match.team1_id).win_count += 1;
      return;
    }

    if (match.winner_id === match.team2_id) {
      standings.get(match.team2_id).win_count += 1;
    }
  });

  return Array.from(standings.values())
    .sort((left, right) => {
      if (right.total_points !== left.total_points) {
        return right.total_points - left.total_points;
      }

      if (right.win_count !== left.win_count) {
        return right.win_count - left.win_count;
      }

      return left.team_id - right.team_id;
    });
};

const syncFinalFromSemiStandings = async (conn, affectedMatchIds = new Set()) => {
  const [semiRows] = await conn.query(
    'SELECT * FROM bracket WHERE round = ? ORDER BY match_number',
    ['semi']
  );

  const completedSemiMatches = semiRows.filter(match =>
    match.team1_id
    && match.team2_id
    && match.status === 'completed'
    && match.team1_score !== null
    && match.team2_score !== null
  );

  if (semiRows.length !== 6 || completedSemiMatches.length !== 6) {
    await resetRoundMatches(conn, 'final', affectedMatchIds);
    return;
  }

  const standings = getSemiStandings(semiRows);

  if (
    standings.length !== 4
    || (
      standings[1]
      && standings[2]
      && standings[1].total_points === standings[2].total_points
    )
  ) {
    await resetRoundMatches(conn, 'final', affectedMatchIds);
    return;
  }

  const finalMatches = [
    { match_number: 1, team1_id: standings[2].team_id, team2_id: standings[3].team_id },
    { match_number: 2, team1_id: standings[0].team_id, team2_id: standings[1].team_id }
  ];
  const [existingFinalRows] = await conn.query(
    'SELECT * FROM bracket WHERE round = ? ORDER BY match_number',
    ['final']
  );
  const existingFinalByMatchNumber = new Map(
    existingFinalRows.map(row => [row.match_number, row])
  );

  for (const finalMatch of finalMatches) {
    const existingFinalMatch = existingFinalByMatchNumber.get(finalMatch.match_number);

    if (!existingFinalMatch) {
      const [insertResult] = await conn.query(
        `INSERT INTO bracket (round, match_number, team1_id, team2_id, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['final', finalMatch.match_number, finalMatch.team1_id, finalMatch.team2_id, 'pending']
      );

      affectedMatchIds.add(insertResult.insertId);
      continue;
    }

    const didTeamsChange = (existingFinalMatch.team1_id || null) !== finalMatch.team1_id
      || (existingFinalMatch.team2_id || null) !== finalMatch.team2_id;
    const nextTeam1Score = didTeamsChange ? null : existingFinalMatch.team1_score;
    const nextTeam2Score = didTeamsChange ? null : existingFinalMatch.team2_score;
    let nextWinnerId = didTeamsChange ? null : existingFinalMatch.winner_id;
    let nextStatus = didTeamsChange ? 'pending' : existingFinalMatch.status;

    if (nextWinnerId && nextWinnerId !== finalMatch.team1_id && nextWinnerId !== finalMatch.team2_id) {
      nextWinnerId = null;
      nextStatus = 'pending';
    }

    const resolvedOutcome = resolveBracketOutcome({
      round: 'final',
      team1Id: finalMatch.team1_id,
      team2Id: finalMatch.team2_id,
      requestedWinnerId: nextWinnerId,
      requestedStatus: nextStatus,
      team1Score: nextTeam1Score,
      team2Score: nextTeam2Score
    });
    const didMatchChange = didTeamsChange
      || existingFinalMatch.team1_score !== nextTeam1Score
      || existingFinalMatch.team2_score !== nextTeam2Score
      || (existingFinalMatch.winner_id || null) !== (resolvedOutcome.safeWinnerId || null)
      || existingFinalMatch.status !== resolvedOutcome.safeStatus;

    if (!didMatchChange) {
      continue;
    }

    await conn.query(
      `UPDATE bracket
       SET team1_id = ?, team2_id = ?, team1_score = ?, team2_score = ?, winner_id = ?, status = ?
       WHERE id = ?`,
      [
        finalMatch.team1_id,
        finalMatch.team2_id,
        nextTeam1Score,
        nextTeam2Score,
        resolvedOutcome.safeWinnerId,
        resolvedOutcome.safeStatus,
        existingFinalMatch.id
      ]
    );

    affectedMatchIds.add(existingFinalMatch.id);
  }
};

const syncNextRoundMatch = async (conn, match, firstRoundMatchCount, affectedMatchIds = new Set()) => {
  if (match.round === 'semi') {
    return;
  }

  const nextRoundKey = getNextRoundKey(match.round, firstRoundMatchCount);

  if (!nextRoundKey) {
    return;
  }

  if (nextRoundKey === 'semi') {
    await syncSemiRoundRobinMatches(conn, firstRoundMatchCount, affectedMatchIds);
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
  const didTeamsChange = (nextRoundMatch.team1_id || null) !== (nextTeam1Id || null)
    || (nextRoundMatch.team2_id || null) !== (nextTeam2Id || null);
  const nextTeam1Score = didTeamsChange ? null : nextRoundMatch.team1_score;
  const nextTeam2Score = didTeamsChange ? null : nextRoundMatch.team2_score;
  let nextWinnerId = didTeamsChange ? null : nextRoundMatch.winner_id;
  let nextStatus = didTeamsChange ? 'pending' : nextRoundMatch.status;

  if (nextWinnerId && nextWinnerId !== nextTeam1Id && nextWinnerId !== nextTeam2Id) {
    nextWinnerId = null;
    nextStatus = 'pending';
  }

  const resolvedOutcome = resolveBracketOutcome({
    round: nextRoundKey,
    team1Id: nextTeam1Id,
    team2Id: nextTeam2Id,
    requestedWinnerId: nextWinnerId,
    requestedStatus: nextStatus,
    team1Score: nextTeam1Score,
    team2Score: nextTeam2Score
  });

  await conn.query(
    `UPDATE bracket
     SET team1_id = ?, team2_id = ?, team1_score = ?, team2_score = ?, winner_id = ?, status = ?
     WHERE id = ?`,
    [
      nextTeam1Id,
      nextTeam2Id,
      nextTeam1Score,
      nextTeam2Score,
      resolvedOutcome.safeWinnerId,
      resolvedOutcome.safeStatus,
      nextRoundMatch.id
    ]
  );

  affectedMatchIds.add(nextRoundMatch.id);

  await syncNextRoundMatch(conn, {
    ...nextRoundMatch,
    team1_id: nextTeam1Id,
    team2_id: nextTeam2Id,
    team1_score: nextTeam1Score,
    team2_score: nextTeam2Score,
    winner_id: resolvedOutcome.safeWinnerId,
    status: resolvedOutcome.safeStatus
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
                player_summary.player1_name,
                player_summary.player2_name
         FROM teams t
         ${teamPlayerSummaryJoinSql}
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
               player_summary.player1_name, player_summary.player1_discord,
               player_summary.player2_name, player_summary.player2_discord
        FROM teams t
        ${teamPlayerSummaryJoinSql}
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

  // Delete Team
  deleteTeam: async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const adminId = req.user?.id;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกรหัสผ่าน'
        });
      }

      // Verify admin password
      const [adminRows] = await mysqli.query(
        'SELECT * FROM admins WHERE id = ?',
        [adminId]
      );

      if (adminRows.length === 0 || adminRows[0].password !== password) {
        return res.status(401).json({
          success: false,
          message: 'รหัสผ่านไม่ถูกต้อง'
        });
      }

      // Delete team (players will be deleted automatically via CASCADE)
      await mysqli.query('DELETE FROM teams WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'ลบทีมสำเร็จ'
      });

    } catch (error) {
      console.error('Delete team error:', error);
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
    const conn = await mysqli.getConnection();

    try {
      await conn.beginTransaction();

      const [maxTeamsRow] = await conn.query(
        'SELECT config_value FROM config WHERE config_key = ?',
        ['max_teams']
      );
      const firstRoundMatchCount = await getFirstRoundMatchCount(conn);
      const affectedMatchIds = new Set();

      await normalizeScoredMatches(conn, affectedMatchIds);

      if (firstRoundMatchCount) {
        await syncSemiRoundRobinMatches(conn, firstRoundMatchCount, affectedMatchIds);
        await syncFinalFromSemiStandings(conn, affectedMatchIds);
      }

      await conn.commit();

      const matches = await getBracketMatches(conn);
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
      await conn.rollback();
      console.error('Get bracket error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาด'
      });
    } finally {
      conn.release();
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
      const team1Score = normalizeBracketScore(req.body.team1_score);
      const team2Score = normalizeBracketScore(req.body.team2_score);
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

        const scoreValidationError = validateBracketScores(requestedRound, team1Id, team2Id, team1Score, team2Score);

        if (scoreValidationError) {
          await conn.rollback();
          res.status(400).json({
            success: false,
            message: scoreValidationError
          });
          return;
        }

        if (requestedRound === 'semi') {
          const semiValidationError = await validateSemiTeams(conn, team1Id, team2Id, firstRoundMatchCount);

          if (semiValidationError) {
            await conn.rollback();
            res.status(400).json({
              success: false,
              message: semiValidationError
            });
            return;
          }
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
        const resolvedOutcome = resolveBracketOutcome({
          round: requestedRound,
          team1Id: team1Id,
          team2Id: team2Id,
          requestedWinnerId: winnerId,
          requestedStatus: req.body.status,
          team1Score: team1Score,
          team2Score: team2Score
        });

        if (existingSlotRows.length > 0) {
          const existingMatch = existingSlotRows[0];

          await conn.query(
            `UPDATE bracket 
             SET team1_id = ?, team2_id = ?, team1_score = ?, team2_score = ?, winner_id = ?, match_time = ?, status = ?, stream_url = ?, notes = ?
             WHERE id = ?`,
            [
              team1Id,
              team2Id,
              team1Score,
              team2Score,
              resolvedOutcome.safeWinnerId,
              matchTime,
              resolvedOutcome.safeStatus,
              streamUrl,
              notes,
              existingMatch.id
            ]
          );

          matchRecord = {
            ...existingMatch,
            id: existingMatch.id,
            round: existingMatch.round,
            match_number: existingMatch.match_number,
            team1_id: team1Id,
            team2_id: team2Id,
            team1_score: team1Score,
            team2_score: team2Score,
            winner_id: resolvedOutcome.safeWinnerId,
            status: resolvedOutcome.safeStatus
          };
        } else {
          const [insertResult] = await conn.query(
            `INSERT INTO bracket (round, match_number, team1_id, team2_id, team1_score, team2_score, winner_id, match_time, status, stream_url, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              requestedRound,
              nextMatchNumber,
              team1Id,
              team2Id,
              team1Score,
              team2Score,
              resolvedOutcome.safeWinnerId,
              matchTime,
              resolvedOutcome.safeStatus,
              streamUrl,
              notes
            ]
          );

          matchRecord = {
            id: insertResult.insertId,
            round: requestedRound,
            match_number: nextMatchNumber,
            team1_id: team1Id,
            team2_id: team2Id,
            team1_score: team1Score,
            team2_score: team2Score,
            winner_id: resolvedOutcome.safeWinnerId,
            status: resolvedOutcome.safeStatus
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
        const scoreValidationError = validateBracketScores(existingMatch.round, team1Id, team2Id, team1Score, team2Score);

        if (scoreValidationError) {
          await conn.rollback();
          res.status(400).json({
            success: false,
            message: scoreValidationError
          });
          return;
        }

        if (existingMatch.round === 'semi') {
          const semiValidationError = await validateSemiTeams(conn, team1Id, team2Id, firstRoundMatchCount);

          if (semiValidationError) {
            await conn.rollback();
            res.status(400).json({
              success: false,
              message: semiValidationError
            });
            return;
          }
        }

        const resolvedOutcome = resolveBracketOutcome({
          round: existingMatch.round,
          team1Id: team1Id,
          team2Id: team2Id,
          requestedWinnerId: winnerId,
          requestedStatus: req.body.status,
          team1Score: team1Score,
          team2Score: team2Score
        });

        await conn.query(
          `UPDATE bracket 
           SET team1_id = ?, team2_id = ?, team1_score = ?, team2_score = ?, winner_id = ?, match_time = ?, status = ?, stream_url = ?, notes = ?
           WHERE id = ?`,
          [
            team1Id,
            team2Id,
            team1Score,
            team2Score,
            resolvedOutcome.safeWinnerId,
            matchTime,
            resolvedOutcome.safeStatus,
            streamUrl,
            notes,
            id
          ]
        );

        matchRecord = {
          ...existingMatch,
          id: existingMatch.id,
          round: existingMatch.round,
          match_number: existingMatch.match_number,
          team1_id: team1Id,
          team2_id: team2Id,
          team1_score: team1Score,
          team2_score: team2Score,
          winner_id: resolvedOutcome.safeWinnerId,
          status: resolvedOutcome.safeStatus
        };
      }

      affectedMatchIds.add(matchRecord.id);
      if (matchRecord.round === 'semi') {
        await syncFinalFromSemiStandings(conn, affectedMatchIds);
      } else {
        await syncNextRoundMatch(conn, matchRecord, firstRoundMatchCount || matchRecord.match_number, affectedMatchIds);
      }
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

      if (match.round === 'semi') {
        await syncSemiRoundRobinMatches(conn, firstRoundMatchCount, affectedMatchIds);
      } else {
        await syncNextRoundMatch(conn, {
          ...match,
          winner_id: null,
          status: 'pending'
        }, firstRoundMatchCount, affectedMatchIds);
      }

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
