const jwtMiddleware = require('./jwt.middleware');

const redirectAdminLogin = (req, res, next) => {
  req.loginRedirect = '/admin/login';
  next();
};

module.exports = {
  redirectAdminLogin,
  requireAdminPage: [
    redirectAdminLogin,
    jwtMiddleware.verifyToken,
    jwtMiddleware.requireRole('admin')
  ],
  requireAdminApi: [
    jwtMiddleware.authenticate,
    jwtMiddleware.requireRoleApi('admin')
  ]
};
