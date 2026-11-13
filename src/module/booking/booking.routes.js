import { Router } from 'express';

import authenticate from '../../common/middleware/authenticate.middleware.js';
import validate from '../../common/middleware/validate.middleware.js';

import CreateBookingDto from './dto/create-booking.dto.js';
import * as bookingController from './booking.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(CreateBookingDto), bookingController.createBooking);

router.get('/', bookingController.getMyBookings);

router.get('/:id', bookingController.getBookingById);

router.patch('/:id/cancel', bookingController.cancelBooking);

export default router;
