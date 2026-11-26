import { Router } from 'express';

import authenticate from '../../common/middleware/authenticate.middleware.js';
import validate from '../../common/middleware/validate.middleware.js';
import authorizeAdmin from '../../common/middleware/authorize-admin.middleware.js';
import ScanBookingQrDto from './dto/scan-booking-qr.dto.js';
import ReassignBookingDto from './dto/reassign-booking.dto.js';

import CreateBookingDto from './dto/create-booking.dto.js';
import * as bookingController from './booking.controller.js';

const router = Router();

router.use(authenticate);

// Admin: view and manage all bookings (registered before /:id so "admin" is not treated as an ID)
router.get(
  '/admin',
  authorizeAdmin,
  bookingController.getAllBookings,
);

router.get(
  '/admin/:id',
  authorizeAdmin,
  bookingController.getAdminBookingById,
);

router.patch(
  '/admin/:id/reassign',
  authorizeAdmin,
  validate(ReassignBookingDto),
  bookingController.reassignBooking,
);

router.patch(
  '/admin/:id/release',
  authorizeAdmin,
  bookingController.releaseBookingEarly,
);

// Admin: scan QR at entry or exit
router.post(
  '/scan',
  authorizeAdmin,
  validate(ScanBookingQrDto),
  bookingController.scanBookingQr,
);

router.post('/', validate(CreateBookingDto), bookingController.createBooking);

router.get('/', bookingController.getMyBookings);

router.get('/:id', bookingController.getBookingById);

router.patch('/:id/cancel', bookingController.cancelBooking);

// Customer: generate QR for their own booking
router.post('/:id/qr', bookingController.generateBookingQr);

export default router;
