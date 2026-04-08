// Middleware to check if admin is authenticated
module.exports = {
  requireAuth: (req, res, next) => {
    if (req.session && req.session.adminId) {
      next();
    } else {
      if (req.path.startsWith('/api/')) {
        res.status(401).json({
          success: false,
          message: 'กรุณาเข้าสู่ระบบ'
        });
      } else {
        res.redirect('/admin/login');
      }
    }
  }
};
