import { randomUUID } from 'node:crypto';
import ParkingSlot from './parking-slot.model.js';
import Booking from '../booking/booking.model.js';
import ApiError from '../../common/utils/api-error.js';

const LOCK_TTL_MS = 2 * 60 * 1000;

const createSlot = async (data) => {
  try {
    return await ParkingSlot.create(data);
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict('Slot number already exists');
    }

    throw error;
  }
};

const getSlots = async (filters = {}) => {
  const query = {};

  if (filters.vehicleType) {
    query.vehicleType = filters.vehicleType;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  return ParkingSlot.find(query).sort({ slotNumber: 1 });
};

const getSlotById = async (slotId) => {
  const slot = await ParkingSlot.findById(slotId);

  if (!slot) {
    throw ApiError.notFound('Parking slot not found');
  }

  return slot;
};

/**
 * Find confirmed bookings reserving this slot now or in the future.
 * A slot remains reserved until its scheduled endTime, even if exitAt was recorded early.
 */
const findConflictingBookingsForSlot = async (slotId, now = new Date()) => {
  return Booking.find({
    parkingSlot: slotId,
    status: 'CONFIRMED',
    endTime: { $gt: now },
  })
    .populate('customer', 'name email')
    .populate('vehicle', 'vehicleNumber vehicleType')
    .populate('parkingSlot', 'slotNumber vehicleType')
    .sort({ startTime: 1 });
};

/**
 * Attach eligible ACTIVE replacement slots (same vehicleType, no overlapping
 * CONFIRMED bookings in the conflict time window) to each conflicting booking.
 */
const attachEligibleReplacements = async (slot, conflicts) => {
  if (conflicts.length === 0) return [];

  const candidateSlots = await ParkingSlot.find({
    _id: { $ne: slot._id },
    vehicleType: slot.vehicleType,
    status: 'ACTIVE',
  }).sort({ slotNumber: 1 });

  if (candidateSlots.length === 0) {
    return conflicts.map((booking) => ({
      booking,
      eligibleSlots: [],
    }));
  }

  const candidateIds = candidateSlots.map((candidate) => candidate._id);
  const minStart = conflicts.reduce(
    (min, b) => (b.startTime < min ? b.startTime : min),
    conflicts[0].startTime,
  );
  const maxEnd = conflicts.reduce(
    (max, b) => (b.endTime > max ? b.endTime : max),
    conflicts[0].endTime,
  );

  const overlappingOnCandidates = await Booking.find({
    parkingSlot: { $in: candidateIds },
    status: 'CONFIRMED',
    startTime: { $lt: maxEnd },
    endTime: { $gt: minStart },
  }).select('parkingSlot startTime endTime');

  return conflicts.map((booking) => {
    const eligibleSlots = candidateSlots.filter((candidate) => {
      const hasOverlap = overlappingOnCandidates.some(
        (existing) =>
          existing.parkingSlot.toString() === candidate._id.toString() &&
          existing.startTime < booking.endTime &&
          existing.endTime > booking.startTime,
      );
      return !hasOverlap;
    });

    return {
      booking,
      eligibleSlots,
    };
  });
};

const getMaintenanceCheck = async (slotId) => {
  const slot = await getSlotById(slotId);
  const conflicts = await findConflictingBookingsForSlot(slotId, new Date());
  const conflictsWithReplacements = await attachEligibleReplacements(
    slot,
    conflicts,
  );

  return {
    slot,
    conflicts: conflictsWithReplacements,
  };
};

const updateSlot = async (slotId, data) => {
  if (data.status === 'MAINTENANCE') {
    const existing = await getSlotById(slotId);

    if (existing.status !== 'MAINTENANCE') {
      const lockToken = randomUUID();
      const lockTime = new Date();
      const lockExpiry = new Date(lockTime.getTime() + LOCK_TTL_MS);

      const lockedSlot = await ParkingSlot.findOneAndUpdate(
        {
          _id: slotId,
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

      if (!lockedSlot) {
        throw ApiError.conflict(
          'Parking slot is currently processing another operation. Try again.',
        );
      }

      try {
        const conflicts = await findConflictingBookingsForSlot(
          slotId,
          new Date(),
        );

        if (conflicts.length > 0) {
          const conflictsWithReplacements = await attachEligibleReplacements(
            lockedSlot,
            conflicts,
          );

          throw ApiError.conflict(
            'Cannot set slot to maintenance while active or upcoming confirmed bookings exist',
            { conflicts: conflictsWithReplacements },
          );
        }

        const updatedSlot = await ParkingSlot.findOneAndUpdate(
          {
            _id: slotId,
            bookingLockToken: lockToken,
          },
          { $set: data },
          {
            new: true,
            runValidators: true,
          },
        );

        return updatedSlot;
      } catch (error) {
        if (error.code === 11000) {
          throw ApiError.conflict('Slot number already exists');
        }
        throw error;
      } finally {
        await ParkingSlot.updateOne(
          {
            _id: slotId,
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
    }
  }

  try {
    const slot = await ParkingSlot.findByIdAndUpdate(
      slotId,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!slot) {
      throw ApiError.notFound('Parking slot not found');
    }

    return slot;
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict('Slot number already exists');
    }

    throw error;
  }
};

const getAvailableSlots = async (filters = {}) => {
  const { vehicleType, startTime, endTime } = filters;

  if (!['TWO_WHEELER', 'FOUR_WHEELER'].includes(vehicleType)) {
    throw ApiError.badRequest('Valid vehicle type is required');
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    !startTime ||
    !endTime ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    throw ApiError.badRequest('Valid start and end times are required');
  }

  if (start <= new Date()) {
    throw ApiError.badRequest('Start time must be in the future');
  }

  if (end <= start) {
    throw ApiError.badRequest('End time must be after start time');
  }

  // Find bookings that overlap the requested time range.
  const overlappingBookings = await Booking.find({
    status: 'CONFIRMED',
    startTime: { $lt: end },
    endTime: { $gt: start },
  }).select('parkingSlot');

  const bookedSlotIds = overlappingBookings.map(
    (booking) => booking.parkingSlot,
  );

  // Return active slots that are not already booked.
  return ParkingSlot.find({
    vehicleType,
    status: 'ACTIVE',
    _id: { $nin: bookedSlotIds },
  }).sort({ slotNumber: 1 });
};

export default {
  createSlot,
  getSlots,
  getSlotById,
  getMaintenanceCheck,
  updateSlot,
  getAvailableSlots,
};
