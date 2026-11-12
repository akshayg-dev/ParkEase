import * as authService from './auth.service.js';
import ApiResponse from '../../common/utils/api-response.js';

// Shared refresh-token cookie configuration
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 3 * 24 * 60 * 60 * 1000,
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

// 1. REGISTER
const register = async (req, res) => {
  const result = await authService.register(req.body);

  ApiResponse.created(res, result.message, {
    user: result.user,
    verificationEmailSent: result.verificationEmailSent,
  });
};

// 2. LOGIN
const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  ApiResponse.ok(res, 'Login successful', {
    user,
    accessToken,
  });
};

// 3. REFRESH ACCESS TOKEN
const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  const result = await authService.refresh(refreshToken);

  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

  ApiResponse.ok(res, 'Token refreshed successfully', {
    accessToken: result.accessToken,
  });
};

// 4. LOGOUT
const logout = async (req, res) => {
  await authService.logout(req.user.id);

  clearRefreshCookie(res);

  ApiResponse.ok(res, 'Logout successful');
};

// 5. FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);

  ApiResponse.ok(res, result.message);
};

// 6. CHANGE PASSWORD (AUTHENTICATED USER)
const newPassword = async (req, res) => {
  const result = await authService.newPassword(
    req.user.id,
    req.body.oldPassword,
    req.body.newPassword,
  );

  clearRefreshCookie(res);

  ApiResponse.ok(res, result.message, {
    user: result.user,
  });
};

// 7. RESET PASSWORD (USING EMAIL TOKEN)
const resetPassword = async (req, res) => {
  const result = await authService.resetPassword(
    req.body.token,
    req.body.newPassword,
  );

  clearRefreshCookie(res);

  ApiResponse.ok(res, result.message);
};

// 8. VERIFY EMAIL
const verifyEmail = async (req, res) => {
  const user = await authService.verifyEmail(req.params.token);

  ApiResponse.ok(res, 'Email verified successfully', { user });
};

// 9. GET CURRENT USER
const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);

  ApiResponse.ok(res, 'User fetched successfully', { user });
};

export {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  newPassword,
  resetPassword,
  verifyEmail,
  getMe,
};
