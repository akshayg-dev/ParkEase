import Booking from './booking.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import ParkingSlot from '../parking-slot/parking-slot.model.js';
import ApiError from '../../common/utils/api-error.js';

const HOURLY_RATES = {
  TWO_WHEELER: 20,
  FOUR_WHEELER: 40,
};

const createBooking = async (userId, data) => {
  const { vehicleId, parkingSlotId, startTime, endTime } = data;

  // 1. Validate booking time
  const now = new Date();

  if (startTime < now) {
    throw ApiError.badRequest('Booking start time cannot be in the past');
  }

  // 2. Verify vehicle ownership
  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    vehicleOwner: userId,
  });

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  // 3. Verify parking slot
  const slot = await ParkingSlot.findById(parkingSlotId);

  if (!slot) {
    throw ApiError.notFound('Parking slot not found');
  }

  if (slot.status !== 'ACTIVE') {
    throw ApiError.badRequest('Parking slot is not active');
  }

  // 4. Verify vehicle and slot compatibility
  if (vehicle.vehicleType !== slot.vehicleType) {
    throw ApiError.badRequest('Vehicle type does not match the parking slot');
  }

  // 5. Calculate price
  const durationMs = endTime - startTime;
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

  if (durationHours < 1) {
    throw ApiError.badRequest('Minimum booking duration is 1 hour');
  }

  const pricePerHour = HOURLY_RATES[vehicle.vehicleType];
  const totalPrice = durationHours * pricePerHour;

  // 6. Check overlapping confirmed bookings
  const overlappingBooking = await Booking.findOne({
    parkingSlot: parkingSlotId,
    status: 'CONFIRMED',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });

  if (overlappingBooking) {
    throw ApiError.conflict('Parking slot is already booked for this time');
  }

  // 7. Create booking
  const booking = await Booking.create({
    customer: userId,
    vehicle: vehicleId,
    parkingSlot: parkingSlotId,
    startTime,
    endTime,
    durationHours,
    pricePerHour,
    totalPrice,
  });

  return booking;
};

const getMyBookings = async (userId) => {
  return Booking.find({ customer: userId })
    .populate('vehicle', 'vehicleNumber vehicleType')
    .populate('parkingSlot', 'slotNumber vehicleType')
    .sort({ createdAt: -1 });
};

const getBookingById = async (userId, bookingId) => {
  const booking = await Booking.findOne({
    _id: bookingId,
    customer: userId,
  })
    .populate('vehicle', 'vehicleNumber vehicleType')
    .populate('parkingSlot', 'slotNumber vehicleType');

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  return booking;
};

const cancelBooking = async (userId, bookingId) => {
  const booking = await Booking.findOne({
    _id: bookingId,
    customer: userId,
  });

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  if (booking.status !== 'CONFIRMED') {
    throw ApiError.badRequest('Only confirmed bookings can be cancelled');
  }

  if (booking.startTime <= new Date()) {
    throw ApiError.badRequest('A booking cannot be cancelled after it starts');
  }

  booking.status = 'CANCELLED';
  await booking.save();

  return booking;
};

export { createBooking, getMyBookings, getBookingById, cancelBooking };
