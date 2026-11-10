import z from 'zod';
import BaseDto from '../../../common/dto/base.dto';

class LoginDto extends BaseDto {
  static schema = z.object({
    email: z.email().trim().toLowerCase,
    password: z.string().minLength(1, 'Password is required')
  });
}

export default LoginDto;
