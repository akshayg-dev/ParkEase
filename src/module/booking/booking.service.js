import Booking from './booking.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import ParkingSlot from '../parking-slot/parking-slot.model.js';
import ApiError from '../../common/utils/api-error.js';
import { randomBytes, createHash } from 'node:crypto';

const HOURLY_RATES = {
  TWO_WHEELER: 20,
  FOUR_WHEELER: 40,
};

const hashQrToken = (token) => createHash('sha256').update(token).digest('hex');

const createBooking = async (userId, data) => {
  const { vehicleId, parkingSlotId, startTime, endTime } = data;

  // 1. Validate booking time
  const now = new Date();

  if (startTime <= now) {
    throw ApiError.badRequest('Booking start time must be in the future');
  }

  if (endTime <= startTime) {
    throw ApiError.badRequest('End time must be after start time');
  }

  const durationMs = endTime - startTime;
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

  if (durationHours < 1) {
    throw ApiError.badRequest('Minimum booking duration is 1 hour');
  }

  // 2. Verify vehicle ownership
  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    vehicleOwner: userId,
  });

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  // 3. Acquire an atomic lock on the parking slot
  const lockToken = randomUUID();
  const lockTime = new Date();
  const lockExpiry = new Date(lockTime.getTime() + 2 * 60 * 1000);

  const slot = await ParkingSlot.findOneAndUpdate(
    {
      _id: parkingSlotId,
      status: 'ACTIVE',
      $or: [
        { bookingLockUntil: null },
        { bookingLockUntil: { $lte: lockTime } },
      ],
    },
    {
      $set: {
        bookingLockToken: lockToken,
        bookingLockUntil: lockExpiry,
      },
    },
    { new: true },
  );

  if (!slot) {
    const existingSlot = await ParkingSlot.findById(parkingSlotId);

    if (!existingSlot) {
      throw ApiError.notFound('Parking slot not found');
    }

    if (existingSlot.status !== 'ACTIVE') {
      throw ApiError.badRequest('Parking slot is not active');
    }

    throw ApiError.conflict(
      'Parking slot is currently processing another booking. Try again.',
    );
  }

  try {
    // 4. Verify vehicle and slot compatibility
    if (vehicle.vehicleType !== slot.vehicleType) {
      throw ApiError.badRequest('Vehicle type does not match the parking slot');
    }

    // 5. Calculate price
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
  } finally {
    // 8. Always release our own lock
    await ParkingSlot.updateOne(
      {
        _id: parkingSlotId,
        bookingLockToken: lockToken,
      },
      {
        $unset: {
          bookingLockToken: 1,
          bookingLockUntil: 1,
        },
      },
    );
  }
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
  booking.qrTokenHash = undefined;
  await booking.save();

  return booking;
};

const generateBookingQr = async (userId, bookingId) => {
  const booking = await Booking.findOne({
    _id: bookingId,
    customer: userId,
  });

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  if (booking.status !== 'CONFIRMED') {
    throw ApiError.badRequest('QR is only available for confirmed bookings');
  }

  if (booking.entryAt || booking.exitAt) {
    throw ApiError.badRequest('QR cannot be regenerated after entry');
  }

  // Generate a cryptographically secure random token.
  const qrToken = randomBytes(32).toString('hex');

  // Store only its hash.
  booking.qrTokenHash = hashQrToken(qrToken);
  await booking.save();

  return {
    bookingId: booking._id,
    qrToken,
  };
};

const scanBookingQr = async ({ qrToken, action }) => {
  const tokenHash = hashQrToken(qrToken);
  const now = new Date();

  if (action === 'ENTRY') {
    // Entry is allowed only during the confirmed booking period.
    const booking = await Booking.findOneAndUpdate(
      {
        qrTokenHash: tokenHash,
        status: 'CONFIRMED',
        entryAt: null,
        exitAt: null,
        startTime: { $lte: now },
        endTime: { $gte: now },
      },
      {
        $set: { entryAt: now },
      },
      { new: true },
    );

    if (!booking) {
      throw ApiError.badRequest(
        'Invalid QR, booking not eligible for entry, or entry already recorded',
      );
    }

    return {
      action: 'ENTRY',
      booking,
    };
  }

  if (action === 'EXIT') {
    const booking = await Booking.findOneAndUpdate(
      {
        qrTokenHash: tokenHash,
        status: { $in: ['CONFIRMED', 'COMPLETED'] },
        entryAt: { $ne: null },
        exitAt: null,
      },
      {
        $set: { exitAt: now },
        $unset: { qrTokenHash: 1 },
      },
      { new: true },
    );

    if (!booking) {
      throw ApiError.badRequest(
        'Invalid QR, entry not recorded, or exit already recorded',
      );
    }

    return {
      action: 'EXIT',
      booking,
    };
  }

  throw ApiError.badRequest('Invalid scan action');
};

export default {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  generateBookingQr,
  scanBookingQr,
};
