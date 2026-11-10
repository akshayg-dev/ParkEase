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

export { getVehicles, addVehicle };
