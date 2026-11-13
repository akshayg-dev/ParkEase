import ApiError from '../utils/api-error.js';

const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required'));
  }

  next();
};

export default authorizeAdmin;
