const express = require('express');
const router = express.Router();
const registerController = require('../../controller/register.controller');
const publicController = require('../../controller/public.controller');

// Public API - Registration
router.post('/register', registerController.register);
router.get('/config', registerController.getConfig);

// Public API - Display Data
router.get('/home', publicController.getHomeData);
router.get('/teams', publicController.getTeams);
router.get('/bracket', publicController.getBracket);
router.get('/live', publicController.getLiveData);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
