import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as controller from './vehicle.controller.js';
import validate from '../../common/middleware/validate.middleware.js';

import CreateVehicleDto from './dto/create-vehicle.dto.js';
import UpdateVehicleDto from './dto/update-vehicle.dto.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.getVehicles);
router.post('/', validate(CreateVehicleDto), controller.addVehicle);

router.patch('/:id/default', controller.setDefaultVehicle);

router
  .route('/:id')
  .get(controller.getVehicleByID)
  .patch(validate(UpdateVehicleDto), controller.updateVehicle)
  .delete(controller.deleteVehicle);

export default router;
