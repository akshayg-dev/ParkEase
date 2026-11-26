import { Router } from 'express';

import authenticate from '../../common/middleware/authenticate.middleware.js';
import authorizeAdmin from '../../common/middleware/authorize-admin.middleware.js';

import adminController from './admin.controller.js';

const router = Router();

router.get(
  '/dashboard',
  authenticate,
  authorizeAdmin,
  adminController.getDashboardStats,
);

export default router;
