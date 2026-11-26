import z from 'zod';
import BaseDto from '../../../common/dto/base.dto.js';

class ChangePasswordDto extends BaseDto {
  static schema = z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  });
}

export default ChangePasswordDto;
