const express = require('express');
const path = require('path');
const router = express.Router();
const jwtMiddleware = require('../../middleware/jwt.middleware');

const redirectAdminLogin = (req, res, next) => {
    req.loginRedirect = '/admin/login';
    next();
};

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

// Teams
router.get('/teams', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/teams.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/main.layout.ejs'),
        title: 'รายชื่อทีม',
        active: 'teams'
    });
});

// Bracket
router.get('/bracket', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/bracket.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/main.layout.ejs'),
        title: 'ตารางการแข่งขัน',
        active: 'bracket'
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

router.get('/admin/login', (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/admin/login.ejs'), {
        layout: false
    });
});

router.get('/admin/dashboard', redirectAdminLogin, jwtMiddleware.verifyToken, jwtMiddleware.requireRole('admin'), (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/admin/dashboard.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/admin.layout.ejs'),
        title: 'Dashboard',
        active: 'dashboard'
    });
});

router.get('/admin/teams', redirectAdminLogin, jwtMiddleware.verifyToken, jwtMiddleware.requireRole('admin'), (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/admin/teams.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/admin.layout.ejs'),
        title: 'จัดการทีม',
        active: 'teams'
    });
});

router.get('/admin/settings', redirectAdminLogin, jwtMiddleware.verifyToken, jwtMiddleware.requireRole('admin'), (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/admin/settings.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/admin.layout.ejs'),
        title: 'ตั้งค่า',
        active: 'settings'
    });
});

router.get('/admin/bracket', redirectAdminLogin, jwtMiddleware.verifyToken, jwtMiddleware.requireRole('admin'), (req, res) => {
    res.render(path.join(__dirname, '../../../views/page/admin/bracket.ejs'), {
        layout: path.join(__dirname, '../../../views/layouts/admin.layout.ejs'),
        title: 'ตารางแข่งขัน',
        active: 'bracket'
    });
});

module.exports = router;
