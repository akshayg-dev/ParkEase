import ParkingSlot from './parking-slot.model.js';
import Booking from '../booking/booking.model.js';
import ApiError from '../../common/utils/api-error.js';

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

const updateSlot = async (slotId, data) => {
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
  updateSlot,
  getAvailableSlots,
};
