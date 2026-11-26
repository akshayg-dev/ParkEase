import z from 'zod';

class BaseDto {
  static schema = z.object({});

  static validate(data) {
    const { error, data: value } = this.schema.safeParse(data);

    if (error) {
      const errors = error.issues.map((d) => d.message);
      return { errors, value: null };
    }

    return { errors: null, value };
  }
}

export default BaseDto;
