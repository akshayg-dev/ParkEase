import ParkingSlot from './parking-slot.model.js';
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

export default {
  createSlot,
  getSlots,
  getSlotById,
  updateSlot,
};
