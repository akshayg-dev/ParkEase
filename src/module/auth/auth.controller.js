import * as authService from './auth.service.js';
import ApiResponse from '../../common/utils/api-response';

// Shared refresh-token cookie configuration
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 3 * 24 * 60 * 60 * 1000,
};

const register = async (req, res) => {
  const user = await authService.register(req.body);

  ApiResponse.created(res, 'Registeration Success', user);
};

const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  ApiResponse.ok(res, 'Login Successful', { user, accessToken });
};

const logout = async (req, res) => {
  await authService.logout(req.user.id);
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  ApiResponse.ok(res, 'Logout Success');
};

export { register, login, logout };
