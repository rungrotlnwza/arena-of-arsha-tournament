const express = require('express');
const path = require('path');
const router = express.Router();

// Mount frontend routes (render EJS)
router.use(require('./frontend/frontend.routes'));

// Mount API routes
router.use('/api', require('./api/api.routes'));

// 404 handler: API/JSON → JSON response, otherwise render 404 page
router.use((req, res) => {
  const isApi = req.path.startsWith('/api/');
  const wantsJson = req.get('Accept') && req.get('Accept').includes('application/json');
  if (isApi || wantsJson) {
    return res.status(404).json({ error: 'Not Found', path: req.path });
  }
  res.status(404).render(path.join(__dirname, '../../views/page/404.ejs'), {
    layout: path.join(__dirname, '../../views/layouts/main.layout.ejs'),
    title: 'ไม่พบหน้า',
    active: ''
  });
});

module.exports = router;
