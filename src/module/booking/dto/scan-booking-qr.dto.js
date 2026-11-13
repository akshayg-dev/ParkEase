import BaseDto from '../../../common/dto/base.dto.js';
import z from 'zod';

class ScanBookingQrDto extends BaseDto {
  static schema = z.object({
    qrToken: z.string().min(1, 'QR token is required'),
    action: z.enum(['ENTRY', 'EXIT']),
  });
}

export default ScanBookingQrDto;
