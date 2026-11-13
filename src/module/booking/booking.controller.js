import bookingService from './booking.service.js';
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

const generateBookingQr = async (req, res, next) => {
  try {
    const result = await bookingService.generateBookingQr(
      req.user.id,
      req.params.id,
    );

    return ApiResponse.ok(res, 'Booking QR generated successfully', result);
  } catch (error) {
    next(error);
  }
};

const scanBookingQr = async (req, res, next) => {
  try {
    const result = await bookingService.scanBookingQr(req.body);

    return ApiResponse.ok(
      res,
      `Booking ${result.action.toLowerCase()} recorded successfully`,
      { booking: result.booking },
    );
  } catch (error) {
    next(error);
  }
};

const getAllBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getAllBookings(req.query);

    return ApiResponse.ok(res, 'All bookings retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getAdminBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getAdminBookingById(req.params.id);

    return ApiResponse.ok(res, 'Booking retrieved successfully', { booking });
  } catch (error) {
    next(error);
  }
};

export {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  generateBookingQr,
  scanBookingQr,
  getAllBookings,
  getAdminBookingById,
};
