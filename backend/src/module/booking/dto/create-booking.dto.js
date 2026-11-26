import BaseDto from '../../../common/dto/base.dto.js';
import z from 'zod';

class CreateBookingDto extends BaseDto {
  static schema = z
    .object({
      vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID'),

      parkingSlotId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid parking slot ID'),

      startTime: z.coerce.date(),

      endTime: z.coerce.date(),
    })
    .refine((data) => data.endTime > data.startTime, {
      message: 'End time must be after start time',
      path: ['endTime'],
    });
}

export default CreateBookingDto;
