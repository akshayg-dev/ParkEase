import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as controller from './vehicle.controller.js';
import validate from '../../common/middleware/validate.middleware.js';
import CreateVehicleDto from './dto/create-vehicle.dto.js';

const router = Router();

router.get('/vehicles', authenticate, controller.getVehicles);

router.post(
  '/vehicles',
  authenticate,
  validate(CreateVehicleDto),
  controller.addVehicle,
);

export default router;
