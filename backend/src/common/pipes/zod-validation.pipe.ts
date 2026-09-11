import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import { type ZodType } from 'zod';

type ZodIssueDetail = {
  field?: string;
  message: string;
};

@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const parsed = this.schema.safeParse(value);

    if (parsed.success) {
      return parsed.data;
    }

    const errors: ZodIssueDetail[] = parsed.error.issues.map((issue) => ({
      field: issue.path.length ? issue.path.join('.') : undefined,
      message: issue.message,
    }));

    throw new BadRequestException({
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    });
  }
}
