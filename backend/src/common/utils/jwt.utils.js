import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';

// ACCESS TOKEN
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    algorithm: 'HS256',
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  });
};

// REFRESH TOKEN
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '3d',
    algorithm: 'HS256',
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
  });
};

// EMAIL VERIFICATION & PASSWORD RESET TOKEN
const generateResetToken = () => {
  const rawToken = randomBytes(32).toString('hex');

  const hashedToken = createHash('sha256').update(rawToken).digest('hex');

  return {
    rawToken,
    hashedToken,
  };
};

export {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateResetToken,
};
