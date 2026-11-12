import ApiError from '../../common/utils/api-error.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
} from '../../common/utils/jwt.utils.js';
import User from './auth.model.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../common/config/email.js';
import { createHash } from 'node:crypto';

// Hash tokens before storing them in the database.
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

// Remove sensitive properties before returning user data.
const sanitizeUser = (user) => {
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.verificationToken;
  delete userObject.verificationTokenExpires;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;

  return userObject;
};

// 1. REGISTER

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    throw ApiError.conflict('User with this email already exists');
  }

  const { rawToken, hashedToken } = generateResetToken();

  const user = await User.create({
    name,
    email,
    password,

    verificationToken: hashedToken,
    verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await sendVerificationEmail(email, rawToken);

  return sanitizeUser(user);
};

// 2. LOGIN

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isVerified) {
    throw ApiError.forbidden('Please verify your email before login');
  }

  const accessToken = generateAccessToken({
    id: user._id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    id: user._id,
  });

  user.refreshToken = hashToken(refreshToken);

  await user.save();

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

// 3. REFRESH ACCESS TOKEN

const refresh = async (token) => {
  if (!token) {
    throw ApiError.unauthorized('Refresh token missing');
  }

  const decoded = verifyRefreshToken(token);

  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const newRefreshToken = generateRefreshToken({
    id: user._id,
  });

  const accessToken = generateAccessToken({
    id: user._id,
    role: user.role,
  });

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      refreshToken: hashToken(token),
    },
    {
      $set: {
        refreshToken: hashToken(newRefreshToken),
      },
    },
    { new: true },
  );

  if (!updatedUser) {
    throw ApiError.unauthorized('Refresh token already used or invalid');
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

// 4. LOGOUT

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    $unset: { refreshToken: 1 },
  });
};

// 5. FORGOT PASSWORD

const forgotPassword = async (email) => {
  const genericMessage =
    'If an account exists with this email, a password reset link will be sent.';

  const user = await User.findOne({ email });

  if (!user) {
    return { message: genericMessage };
  }

  const { rawToken, hashedToken } = generateResetToken();

  user.resetPasswordToken = hashedToken;

  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

  await user.save();

  await sendPasswordResetEmail(email, rawToken);

  return { message: genericMessage };
};

// 6. CHANGE PASSWORD (AUTHENTICATED USER)

const newPassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  const isMatch = await user.comparePassword(oldPassword);

  if (!isMatch) {
    throw ApiError.unauthorized('Old password is incorrect');
  }

  user.password = newPassword;

  // Revoke the existing refresh session.
  user.refreshToken = undefined;

  await user.save();

  return {
    message: 'Password changed successfully',
    user: sanitizeUser(user),
  };
};

// 7. RESET PASSWORD (USING EMAIL TOKEN)

const resetPassword = async (resetToken, newPassword) => {
  if (!resetToken) {
    throw ApiError.unauthorized('Reset password token missing');
  }

  const hashedToken = hashToken(resetToken);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid or expired reset token');
  }

  user.password = newPassword;

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  // Invalidate the existing refresh session.
  user.refreshToken = undefined;

  await user.save();

  return {
    message: 'Password reset successfully',
  };
};

// 8. VERIFY EMAIL

const verifyEmail = async (token) => {
  if (!token) {
    throw ApiError.badRequest('Verification token missing');
  }

  const hashedToken = hashToken(token);

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid or expired verification token');
  }

  user.isVerified = true;

  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;

  await user.save();

  return sanitizeUser(user);
};

// 9. GET CURRENT USER

const getMe = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return sanitizeUser(user);
};

export {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  newPassword,
  resetPassword,
  getMe,
  verifyEmail,
};
