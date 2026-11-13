import ApiError from '../../common/utils/api-error.js';
import Vehicle from './vehicle.model.js';

const getVehicles = async (userId) => {
  return await Vehicle.find({ vehicleOwner: userId }).sort({
    isDefault: -1,
    createdAt: -1,
  });
};

const addVehicle = async (userId, userBody) => {
  const vehicleCount = await Vehicle.countDocuments({
    vehicleOwner: userId,
  });

  try {
    const vehicle = await Vehicle.create({
      vehicleOwner: userId,
      vehicleNumber: userBody.vehicleNumber,
      vehicleType: userBody.vehicleType,
      isDefault: vehicleCount === 0,
    });

    return vehicle;
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict('This vehicle is already registered');
    }
    throw error;
  }
};

const getVehicleByID = async (userId, vehicleId) => {
  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    vehicleOwner: userId,
  });

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  return vehicle;
};

const updateVehicle = async (userId, vehicleId, userBody) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      {
        _id: vehicleId,
        vehicleOwner: userId,
      },
      { $set: userBody },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    return vehicle;
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict('This vehicle number is already registered');
    }
    throw error;
  }
};

const deleteVehicle = async (userId, vehicleId) => {
  const vehicle = await Vehicle.findOneAndDelete({
    _id: vehicleId,
    vehicleOwner: userId,
  });

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  // If the deleted vehicle was default, promote another vehicle.
  if (vehicle.isDefault) {
    const nextVehicle = await Vehicle.findOne({
      vehicleOwner: userId,
    }).sort({ createdAt: 1 });

    if (nextVehicle) {
      nextVehicle.isDefault = true;
      await nextVehicle.save();
    }
  }

  return vehicle;
};

const setDefaultVehicle = async (userId, vehicleId) => {
  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    vehicleOwner: userId,
  });

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  await Vehicle.updateMany(
    { vehicleOwner: userId },
    { $set: { isDefault: false } },
  );

  vehicle.isDefault = true;
  await vehicle.save();

  return vehicle;
};

export {
  getVehicles,
  addVehicle,
  getVehicleByID,
  updateVehicle,
  deleteVehicle,
  setDefaultVehicle,
};
