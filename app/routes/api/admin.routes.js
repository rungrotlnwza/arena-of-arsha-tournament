const express = require('express');
const router = express.Router();
const adminController = require('../../controller/admin.controller');
const { requireAuth } = require('../../middleware/admin.middleware');

// Public routes
router.post('/login', adminController.login);
router.get('/check', adminController.checkAuth);

// Protected routes
router.post('/logout', requireAuth, adminController.logout);
router.get('/dashboard', requireAuth, adminController.getDashboard);
router.get('/teams', requireAuth, adminController.getTeams);
router.put('/teams/:id/status', requireAuth, adminController.updateTeamStatus);
router.get('/config', requireAuth, adminController.getConfig);
router.put('/config', requireAuth, adminController.updateConfig);
router.get('/bracket', requireAuth, adminController.getBracket);
router.post('/bracket/generate', requireAuth, adminController.generateBracket);
router.post('/bracket/:id', requireAuth, adminController.saveBracketMatch);
router.delete('/bracket/:id', requireAuth, adminController.deleteBracketMatch);

module.exports = router;
