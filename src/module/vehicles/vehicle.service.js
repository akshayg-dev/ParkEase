import ApiError from '../../common/utils/api-error.js';
import Vehicle from './vehicle.model.js';

const getVehicles = async (userId) => {
  const vehicles = await Vehicle.find({ vehicleOwner: userId });

  return vehicles;
};

const addVehicle = async (userId, userBody) => {
  const vehicle = await Vehicle.create({
    vehicleOwner: userId,
    vehicleNumber: userBody.vehicleNumber,
    vehicleType: userBody.vehicleType,
  });

  return vehicle;
};

const getVehicleByID = async (userId) => {
  const vehicle = await Vehicle.findById(userId);

  if (!vehicle) throw ApiError.notFound('You have not added any vehicle');

  return vehicle;
};

export { getVehicles, addVehicle, getVehicleByID };
