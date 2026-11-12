import { Router } from 'express';
import RegisterDto from './dto/register.dto.js';
import LoginDto from './dto/login.dto.js';
import ForgotPasswordDto from './dto/forgot-password.dto.js';
import ResetPasswordDto from './dto/reset-password.dto.js';
import ChangePasswordDto from './dto/change-password.dto.js';
import validate from '../../common/middleware/validate.middleware.js';
import authenticate from '../../common/middleware/authenticate.middleware.js';
import * as controller from './auth.controller.js';

const router = Router();

// Public routes
router.post('/register', validate(RegisterDto), controller.register);

router.post('/login', validate(LoginDto), controller.login);

router.post('/refresh', controller.refresh);

router.post(
  '/forgot-password',
  validate(ForgotPasswordDto),
  controller.forgotPassword,
);

router.post(
  '/reset-password',
  validate(ResetPasswordDto),
  controller.resetPassword,
);

router.get('/verify-email/:token', controller.verifyEmail);

// Protected routes
router.post('/logout', authenticate, controller.logout);

router.patch(
  '/change-password',
  authenticate,
  validate(ChangePasswordDto),
  controller.newPassword,
);

router.get('/me', authenticate, controller.getMe);

export default router;
