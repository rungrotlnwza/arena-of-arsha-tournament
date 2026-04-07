const express = require('express');
const path = require('path');
const router = express.Router();

// Path to views from app/routes/frontend/ → ../../../views/
const viewsBase = path.join(__dirname, '../../../views');

// Mock data for tournament
const tournamentData = {
    stats: {
        teams: 0,
        players: 0,
        slots: 32,
        viewers: 0
    },
    teams: [],
    isLive: false
};

// Home
router.get('/', (req, res) => {
    res.render(path.join(viewsBase, 'page/index.ejs'), {
        layout: path.join(viewsBase, 'layouts/main.layout.ejs'),
        title: 'หน้าแรก',
        active: 'home'
    });
});

// Rules
router.get('/rules', (req, res) => {
    res.render(path.join(viewsBase, 'page/rules.ejs'), {
        layout: path.join(viewsBase, 'layouts/main.layout.ejs'),
        title: 'กติกาการเข้าร่วมแข่งขัน',
        active: 'rules'
    });
});

// Register - GET
router.get('/register', (req, res) => {
    res.render(path.join(viewsBase, 'page/register.ejs'), {
        layout: path.join(viewsBase, 'layouts/main.layout.ejs'),
        title: 'สมัครเข้าแข่งขัน',
        active: 'register'
    });
});

// Register - POST
router.post('/register', (req, res) => {
    const { teamName, player1Name, player2Name } = req.body;

    // In a real app, save to database here
    console.log('New registration:', req.body);

    // Add to mock data
    tournamentData.teams.push({
        id: Date.now(),
        name: teamName,
        player1: { name: player1Name },
        player2: { name: player2Name },
        status: 'pending'
    });
    tournamentData.stats.teams++;
    tournamentData.stats.players += 2;
    tournamentData.stats.slots--;

    res.render(path.join(viewsBase, 'page/register-success.ejs'), {
        layout: path.join(viewsBase, 'layouts/main.layout.ejs'),
        title: 'สมัครสำเร็จ',
        active: 'register',
        teamName
    });
});

// Teams
router.get('/teams', (req, res) => {
    res.render(path.join(viewsBase, 'page/teams.ejs'), {
        layout: path.join(viewsBase, 'layouts/main.layout.ejs'),
        title: 'ตารางทีมแข่ง',
        active: 'teams',
        stats: tournamentData.stats,
        teams: tournamentData.teams
    });
});

// Live
router.get('/live', (req, res) => {
    res.render(path.join(viewsBase, 'page/live.ejs'), {
        layout: path.join(viewsBase, 'layouts/main.layout.ejs'),
        title: 'ช่องถ่ายทอดสด',
        active: 'live',
        isLive: tournamentData.isLive,
        domain: req.get('host'),
        stats: tournamentData.stats
    });
});

module.exports = router;
