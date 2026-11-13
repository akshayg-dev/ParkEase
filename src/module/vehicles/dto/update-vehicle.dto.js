import BaseDto from '../../../common/dto/base.dto.js';
import z from 'zod';

class UpdateVehicleDto extends BaseDto {
  static schema = z
    .object({
      vehicleNumber: z
        .string()
        .trim()
        .transform((val) => val.replace(/[\s-]/g, '').toUpperCase())
        .refine(
          (val) =>
            /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(val) ||
            /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(val),
          { message: 'Invalid Indian vehicle registration number' },
        )
        .optional(),

      vehicleType: z.enum(['TWO_WHEELER', 'FOUR_WHEELER']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    });
}

export default UpdateVehicleDto;
