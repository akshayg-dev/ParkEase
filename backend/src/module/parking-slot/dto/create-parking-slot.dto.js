import BaseDto from '../../../common/dto/base.dto.js';
import z from 'zod';

class CreateParkingSlotDto extends BaseDto {
  static schema = z.object({
    slotNumber: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .transform((val) => val.toUpperCase()),

    vehicleType: z.enum(['TWO_WHEELER', 'FOUR_WHEELER']),
  });
}

export default CreateParkingSlotDto;
