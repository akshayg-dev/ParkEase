import BaseDto from '../../../common/dto/base.dto.js';
import z from 'zod';

class CreateVehicleDto extends BaseDto {
  static schema = z.object({
    vehicleNumber: z
      .string()
      .trim()
      .transform((val) => val.replace(/[\s-]/g, '').toUpperCase())
      .refine(
        (val) =>
          /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(val) ||
          /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(val),
        {
          message: 'Invalid Indian vehicle registration number',
        },
      ),
    vehicleType: z.enum(['TWO_WHEELER', 'FOUR_WHEELER']),
  });
}

export default CreateVehicleDto;
