import ApiResponse from '../../common/utils/api-response.js';
import * as vehicleService from './vehicle.service.js';

const getVehicles = async (req, res) => {
  const vehicles = await vehicleService.getVehicles(req.user.id);

  return ApiResponse.ok(res, 'Vehicles retrieved successfully', vehicles);
};

const addVehicle = async (req, res) => {
  const result = await vehicleService.addVehicle(req.user.id, req.body);

  return ApiResponse.created(res, 'Vehicle added successfully', result);
};

const getVehicleByID = async (req, res) => {
  const result = await vehicleService.getVehicleByID(
    req.user.id,
    req.params.id,
  );

  return ApiResponse.ok(res, 'Vehicle retrieved successfully', result);
};

const updateVehicle = async (req, res) => {
  const result = await vehicleService.updateVehicle(
    req.user.id,
    req.params.id,
    req.body,
  );

  return ApiResponse.ok(res, 'Vehicle updated successfully', result);
};

const deleteVehicle = async (req, res) => {
  const result = await vehicleService.deleteVehicle(req.user.id, req.params.id);

  return ApiResponse.ok(res, 'Vehicle deleted successfully', result);
};

const setDefaultVehicle = async (req, res) => {
  const result = await vehicleService.setDefaultVehicle(
    req.user.id,
    req.params.id,
  );

  return ApiResponse.ok(res, 'Default vehicle updated successfully', result);
};

export {
  getVehicles,
  addVehicle,
  getVehicleByID,
  updateVehicle,
  deleteVehicle,
  setDefaultVehicle,
};
