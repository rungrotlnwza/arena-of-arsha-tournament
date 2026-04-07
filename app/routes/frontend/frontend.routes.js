const express = require('express');
const path = require('path');
const router = express.Router();

// Home
router.get('/', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/index.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/main.layout.ejs'),
        title: 'หน้าแรก',
        active: 'home'
    });
});

// Rules
router.get('/rules', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/rules.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/main.layout.ejs'),
        title: 'กติกาการเข้าร่วมแข่งขัน',
        active: 'rules'
    });
});

// Register
router.get('/register', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/register.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/main.layout.ejs'),
        title: 'สมัครเข้าแข่งขัน',
        active: 'register'
    });
});

// Register Success - Static page
router.get('/register-success', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/register-success.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/main.layout.ejs'),
        title: 'สมัครสำเร็จ',
        active: 'register'
    });
});

// Teams
router.get('/teams', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/teams.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/main.layout.ejs'),
        title: 'ตารางทีมแข่ง',
        active: 'teams'
    });
});

// Live
router.get('/live', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/live.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/main.layout.ejs'),
        title: 'ช่องถ่ายทอดสด',
        active: 'live'
    });
});

module.exports = router;
