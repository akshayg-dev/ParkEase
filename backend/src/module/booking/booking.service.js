import Booking from './booking.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import ParkingSlot from '../parking-slot/parking-slot.model.js';
import ApiError from '../../common/utils/api-error.js';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

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

  if (booking.entryAt || (booking.gateSessions && booking.gateSessions.length > 0)) {
    throw ApiError.badRequest('A booking cannot be cancelled after entry');
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
  // Generate a cryptographically secure random token.
  const qrToken = randomBytes(32).toString('hex');
  const tokenHash = hashQrToken(qrToken);
  const now = new Date();

  // Atomically replace qrTokenHash when booking can legitimately present a QR:
  // 1) Confirmed booking before endTime (pre-entry Entry QR or retained Re-entry QR)
  // 2) Currently checked-in booking (CONFIRMED or COMPLETED while inside) awaiting Exit QR
  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      customer: userId,
      $or: [
        // Checked in (inside) — Exit QR allowed even past endTime
        {
          status: { $in: ['CONFIRMED', 'COMPLETED'] },
          entryAt: { $ne: null },
          exitAt: null,
        },
        // Pre-entry or exited-with-retention — Entry / Re-entry QR allowed before endTime
        {
          status: 'CONFIRMED',
          endTime: { $gt: now },
        },
      ],
    },
    {
      $set: { qrTokenHash: tokenHash },
    },
    { new: true },
  );

  if (!booking) {
    const existing = await Booking.findOne({
      _id: bookingId,
      customer: userId,
    });

    if (!existing) {
      throw ApiError.notFound('Booking not found');
    }

    if (existing.status === 'EARLY_RELEASED') {
      throw ApiError.badRequest(
        'QR is no longer available after releasing the reservation',
      );
    }

    if (existing.status === 'CANCELLED') {
      throw ApiError.badRequest('QR is not available for cancelled bookings');
    }

    if (existing.status === 'COMPLETED' || existing.endTime <= now) {
      throw ApiError.badRequest('QR is no longer available for completed bookings');
    }

    throw ApiError.badRequest(
      'QR is only available for confirmed or checked-in bookings',
    );
  }

  return {
    bookingId: booking._id,
    qrToken,
  };
};

const scanBookingQr = async ({ qrToken, action }) => {
  const tokenHash = hashQrToken(qrToken);
  const now = new Date();

  if (action === 'ENTRY') {
    // Entry / re-entry is allowed when confirmed, within scheduled window,
    // and NOT currently inside (either never entered or previously exited).
    const booking = await Booking.findOneAndUpdate(
      {
        qrTokenHash: tokenHash,
        status: 'CONFIRMED',
        startTime: { $lte: now },
        endTime: { $gt: now },
        $or: [{ entryAt: null }, { exitAt: { $ne: null } }],
      },
      {
        $set: {
          entryAt: now,
          exitAt: null,
        },
        $push: {
          gateSessions: {
            entryAt: now,
            exitAt: null,
          },
        },
      },
      { new: true },
    )
      .populate('customer', 'name email')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .populate('parkingSlot', 'slotNumber vehicleType');

    if (!booking) {
      throw ApiError.badRequest(
        'Invalid QR, booking already checked in, or outside the scheduled booking window',
      );
    }

    return {
      action: 'ENTRY',
      booking,
    };
  }

  if (action === 'EXIT') {
    // Atomically claim the active inside session (exitAt === null).
    const claimed = await Booking.findOneAndUpdate(
      {
        qrTokenHash: tokenHash,
        status: { $in: ['CONFIRMED', 'COMPLETED'] },
        entryAt: { $ne: null },
        exitAt: null,
      },
      {
        $set: { exitAt: now },
      },
      { new: true },
    ).select('+qrTokenHash');

    if (!claimed) {
      throw ApiError.badRequest(
        'Invalid QR, entry not recorded, or exit already recorded',
      );
    }

    // Close the open gateSession entry (or backfill for legacy bookings without gateSessions).
    const sessions = Array.isArray(claimed.gateSessions)
      ? claimed.gateSessions
      : [];
    const openIndex = [...sessions]
      .reverse()
      .findIndex((session) => !session.exitAt);

    if (openIndex !== -1) {
      const targetIndex = sessions.length - 1 - openIndex;
      sessions[targetIndex].exitAt = now;
    } else if (claimed.entryAt) {
      sessions.push({ entryAt: claimed.entryAt, exitAt: now });
    }
    claimed.gateSessions = sessions;

    const isEarlyExit =
      claimed.status === 'CONFIRMED' && now < claimed.endTime;

    if (!isEarlyExit) {
      claimed.status = 'COMPLETED';
      claimed.qrTokenHash = undefined;
    }

    await claimed.save();

    const populated = await Booking.findById(claimed._id)
      .populate('customer', 'name email')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .populate('parkingSlot', 'slotNumber vehicleType');

    return {
      action: 'EXIT',
      isEarlyExit,
      booking: populated,
    };
  }

  throw ApiError.badRequest('Invalid scan action');
};

const releaseBookingEarly = async (bookingId) => {
  const now = new Date();

  const released = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: 'CONFIRMED',
      entryAt: { $ne: null },
      exitAt: { $ne: null },
      endTime: { $gt: now },
    },
    {
      $set: {
        status: 'EARLY_RELEASED',
        releasedAt: now,
      },
      $unset: {
        qrTokenHash: 1,
      },
    },
    { new: true },
  )
    .populate('customer', 'name email')
    .populate('vehicle', 'vehicleNumber vehicleType')
    .populate('parkingSlot', 'slotNumber vehicleType');

  if (!released) {
    const existing = await Booking.findById(bookingId);

    if (!existing) {
      throw ApiError.notFound('Booking not found');
    }

    if (existing.status === 'EARLY_RELEASED') {
      throw ApiError.badRequest('Booking reservation has already been released');
    }

    if (existing.status !== 'CONFIRMED') {
      throw ApiError.badRequest('Only confirmed bookings can be released early');
    }

    if (!existing.entryAt || !existing.exitAt) {
      throw ApiError.badRequest(
        'Booking must be exited before releasing the remaining reservation',
      );
    }

    throw ApiError.badRequest('Booking period has already ended');
  }

  return released;
};

const getAllBookings = async (filters = {}) => {
  const { status, startDate, endDate, page = 1, limit = 10 } = filters;

  const query = {};

  // Filter by booking status
  if (status) {
    if (
      !['CONFIRMED', 'CANCELLED', 'COMPLETED', 'EARLY_RELEASED'].includes(
        status,
      )
    ) {
      throw ApiError.badRequest('Invalid booking status');
    }

    query.status = status;
  }

  // Filter bookings by their start time
  if (startDate || endDate) {
    query.startTime = {};

    if (startDate) {
      const from = new Date(startDate);

      if (Number.isNaN(from.getTime())) {
        throw ApiError.badRequest('Invalid start date');
      }

      query.startTime.$gte = from;
    }

    if (endDate) {
      const to = new Date(endDate);

      if (Number.isNaN(to.getTime())) {
        throw ApiError.badRequest('Invalid end date');
      }

      // Include the entire end date
      to.setUTCHours(23, 59, 59, 999);
      query.startTime.$lte = to;
    }
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (currentPage - 1) * pageSize;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('customer', 'name email')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .populate('parkingSlot', 'slotNumber vehicleType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),

    Booking.countDocuments(query),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const getAdminBookingById = async (bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate('customer', 'name email')
    .populate('vehicle', 'vehicleNumber vehicleType')
    .populate('parkingSlot', 'slotNumber vehicleType');

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  return booking;
};

const reassignBooking = async (bookingId, targetSlotId) => {
  const booking = await Booking.findById(bookingId)
    .populate('vehicle', 'vehicleNumber vehicleType')
    .populate('parkingSlot', 'slotNumber vehicleType');

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  if (booking.status !== 'CONFIRMED') {
    throw ApiError.badRequest('Only confirmed bookings can be reassigned');
  }

  if (booking.endTime <= new Date()) {
    throw ApiError.badRequest('Cannot reassign a booking that has already ended');
  }

  if (booking.parkingSlot?._id?.toString() === targetSlotId) {
    throw ApiError.badRequest('Booking is already assigned to this parking slot');
  }

  const lockToken = randomUUID();
  const lockTime = new Date();
  const lockExpiry = new Date(lockTime.getTime() + 2 * 60 * 1000);

  const targetSlot = await ParkingSlot.findOneAndUpdate(
    {
      _id: targetSlotId,
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

  if (!targetSlot) {
    const existingTarget = await ParkingSlot.findById(targetSlotId);

    if (!existingTarget) {
      throw ApiError.notFound('Replacement parking slot not found');
    }

    if (existingTarget.status !== 'ACTIVE') {
      throw ApiError.badRequest('Replacement parking slot must be active');
    }

    throw ApiError.conflict(
      'Replacement parking slot is currently processing another operation. Try again.',
    );
  }

  try {
    if (booking.vehicle?.vehicleType !== targetSlot.vehicleType) {
      throw ApiError.badRequest(
        'Replacement slot vehicle type does not match the booking vehicle',
      );
    }

    const overlappingBooking = await Booking.findOne({
      _id: { $ne: booking._id },
      parkingSlot: targetSlotId,
      status: 'CONFIRMED',
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime },
    });

    if (overlappingBooking) {
      throw ApiError.conflict(
        'Replacement slot already has an overlapping confirmed booking for this time window',
      );
    }

    // Update only the parkingSlot reference, preserving ID, times, pricing, and qrTokenHash.
    const updatedBooking = await Booking.findByIdAndUpdate(
      booking._id,
      { $set: { parkingSlot: targetSlotId } },
      { new: true },
    )
      .populate('customer', 'name email')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .populate('parkingSlot', 'slotNumber vehicleType');

    return updatedBooking;
  } finally {
    await ParkingSlot.updateOne(
      {
        _id: targetSlotId,
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

export default {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  generateBookingQr,
  scanBookingQr,
  releaseBookingEarly,
  getAllBookings,
  getAdminBookingById,
  reassignBooking,
};
