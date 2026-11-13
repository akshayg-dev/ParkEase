import z from 'zod';
import BaseDto from '../../../common/dto/base.dto.js';

class LoginDto extends BaseDto {
  static schema = z.object({
    email: z.email().trim().toLowerCase,
    password: z.string().min(1, 'Password is required'),
  });
}

export default LoginDto;
