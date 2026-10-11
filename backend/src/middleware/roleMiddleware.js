const { errorResponse } = require('../utils/response');

const roleMiddleware = (allowedRoles = ['ADMIN']) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'User identity not found. Authorization failed.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}].`,
        403,
        null,
        {
          code: 'FORBIDDEN',
          recommendation: `Your account role (${req.user.role}) does not have permission for this resource.`
        }
      );
    }

    next();
  };
};

module.exports = roleMiddleware;
