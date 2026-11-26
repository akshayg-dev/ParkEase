import BaseDto from '../../../common/dto/base.dto.js';
import z from 'zod';

class UpdateParkingSlotDto extends BaseDto {
  static schema = z
    .object({
      slotNumber: z
        .string()
        .trim()
        .min(1)
        .max(20)
        .transform((val) => val.toUpperCase())
        .optional(),

      vehicleType: z.enum(['TWO_WHEELER', 'FOUR_WHEELER']).optional(),

      status: z.enum(['ACTIVE', 'MAINTENANCE']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    });
}

export default UpdateParkingSlotDto;
