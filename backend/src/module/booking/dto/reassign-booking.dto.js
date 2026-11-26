import BaseDto from '../../../common/dto/base.dto.js';
import z from 'zod';

class ReassignBookingDto extends BaseDto {
  static schema = z.object({
    targetSlotId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid target parking slot ID'),
  });
}

export default ReassignBookingDto;
