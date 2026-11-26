import { Router } from 'express';

import parkingSlotController from './parking-slot.controller.js';

import CreateParkingSlotDto from './dto/create-parking-slot.dto.js';
import UpdateParkingSlotDto from './dto/update-parking-slot.dto.js';

import validate from '../../common/middleware/validate.middleware.js';
import authenticate from '../../common/middleware/authenticate.middleware.js';
import authorizeAdmin from '../../common/middleware/authorize-admin.middleware.js';

const router = Router();

// Customer + Admin
router.get('/', authenticate, parkingSlotController.getSlots);

// Admin only
router.get(
  '/:id/maintenance-check',
  authenticate,
  authorizeAdmin,
  parkingSlotController.getMaintenanceCheck,
);

router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(CreateParkingSlotDto),
  parkingSlotController.createSlot,
);

router.patch(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(UpdateParkingSlotDto),
  parkingSlotController.updateSlot,
);

router.get(
  '/availability',
  authenticate,
  parkingSlotController.getAvailableSlots,
);

router.get('/:id', authenticate, parkingSlotController.getSlotById);

export default router;
