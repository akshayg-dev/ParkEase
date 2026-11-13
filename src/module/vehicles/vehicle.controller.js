import ApiResponse from '../../common/utils/api-response.js';
import * as vehicleService from './vehicle.service.js';

const getVehicles = async (req, res) => {
  const vehicles = await vehicleService.getVehicles(req.user.id);

  return ApiResponse.ok(res, 'Vehicles retrived successfully', vehicles);
};

const addVehicle = async (req, res) => {
  const result = await vehicleService.addVehicle(req.user.id, req.body);

  return ApiResponse.created(res, 'Vehicle added successfully', result);
};

const getVehicleByID = async (req, res) => {
  const result = await vehicleService.getVehicleByID(req.params.id);

  return ApiResponse.ok(res, 'Vehcile retrived successfully', result);
};

export { getVehicles, addVehicle, getVehicleByID };
