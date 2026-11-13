import z from 'zod';
import BaseDto from '../../../common/dto/base.dto.js';

class RegisterDto extends BaseDto {
  static schema = z.object({
    name: z.string().trim().min(2).max(50),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8),
  });
}

export default RegisterDto;
