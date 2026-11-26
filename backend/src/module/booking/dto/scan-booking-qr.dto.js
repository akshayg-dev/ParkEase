import BaseDto from '../../../common/dto/base.dto.js';
import z from 'zod';

class ScanBookingQrDto extends BaseDto {
  static schema = z.object({
    qrToken: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid QR token'),
    action: z.enum(['ENTRY', 'EXIT']),
  });
}

export default ScanBookingQrDto;
