const express = require('express');
const router = express.Router();

router.use('/user', require('./user/user.routes'));

// Health check (optional)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
