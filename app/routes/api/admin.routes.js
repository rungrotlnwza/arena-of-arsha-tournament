const express = require('express');
const router = express.Router();
const adminController = require('../../controller/admin.controller');
const jwtMiddleware = require('../../middleware/jwt.middleware');

// Public routes
router.post('/login', adminController.login);
router.get('/check', adminController.checkAuth);

// Protected routes
router.post('/logout', jwtMiddleware.authenticate, adminController.logout);
router.get('/dashboard', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.getDashboard);
router.get('/teams', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.getTeams);
router.put('/teams/:id/status', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.updateTeamStatus);
router.get('/config', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.getConfig);
router.put('/config', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.updateConfig);
router.get('/bracket', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.getBracket);
router.post('/bracket/generate', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.generateBracket);
router.post('/bracket/reset', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.resetBracket);
router.post('/bracket/:id', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.saveBracketMatch);
router.delete('/bracket/:id', jwtMiddleware.authenticate, jwtMiddleware.requireRoleApi('admin'), adminController.deleteBracketMatch);

module.exports = router;
