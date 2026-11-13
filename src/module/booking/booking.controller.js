import * as bookingService from './booking.service.js';
import ApiResponse from '../../common/utils/api-response.js';

const createBooking = async (req, res) => {
  const booking = await bookingService.createBooking(req.user.id, req.body);

  return ApiResponse.created(res, 'Parking booked successfully', { booking });
};

const getMyBookings = async (req, res) => {
  const bookings = await bookingService.getMyBookings(req.user.id);

  return ApiResponse.ok(res, 'Bookings retrieved successfully', { bookings });
};

const getBookingById = async (req, res) => {
  const booking = await bookingService.getBookingById(
    req.user.id,
    req.params.id,
  );

  return ApiResponse.ok(res, 'Booking retrieved successfully', { booking });
};

const cancelBooking = async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.user.id,
    req.params.id,
  );

  return ApiResponse.ok(res, 'Booking cancelled successfully', { booking });
};

export { createBooking, getMyBookings, getBookingById, cancelBooking };
