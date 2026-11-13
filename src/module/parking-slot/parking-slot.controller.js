import parkingSlotService from './parking-slot.service.js';
import ApiResponse from '../../common/utils/api-response.js';

const createSlot = async (req, res, next) => {
  try {
    const slot = await parkingSlotService.createSlot(req.body);

    return ApiResponse.created(res, 'Parking slot created successfully', {
      slot,
    });
  } catch (error) {
    next(error);
  }
};

const getSlots = async (req, res, next) => {
  try {
    const slots = await parkingSlotService.getSlots(req.query);

    return ApiResponse.ok(res, 'Parking slots retrieved successfully', {
      slots,
    });
  } catch (error) {
    next(error);
  }
};

const getSlotById = async (req, res, next) => {
  try {
    const slot = await parkingSlotService.getSlotById(req.params.id);

    return ApiResponse.ok(res, 'Parking slot retrieved successfully', { slot });
  } catch (error) {
    next(error);
  }
};

const updateSlot = async (req, res, next) => {
  try {
    const slot = await parkingSlotService.updateSlot(req.params.id, req.body);

    return ApiResponse.ok(res, 'Parking slot updated successfully', { slot });
  } catch (error) {
    next(error);
  }
};

export default {
  createSlot,
  getSlots,
  getSlotById,
  updateSlot,
};
