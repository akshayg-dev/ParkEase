import ApiError from '../utils/api-error.js';
import { verifyAccessToken } from '../utils/jwt.utils.js';

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token missing');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw ApiError.unauthorized('Access token missing');
    }

    const decoded = verifyAccessToken(token);

    if (!decoded.id || !decoded.role) {
      throw ApiError.unauthorized('Invalid access token');
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    return next(ApiError.unauthorized('Invalid or expired access token'));
  }
};

export default authenticate;
