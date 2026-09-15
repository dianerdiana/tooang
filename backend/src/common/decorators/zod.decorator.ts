import { Body, createParamDecorator, type ExecutionContext, Param, Query } from '@nestjs/common';

import { type ZodType } from 'zod';

import { ZodValidationPipe } from '../pipes';

export function ZodBody<TOutput = unknown>(schema: ZodType<TOutput>): ParameterDecorator {
  return Body(new ZodValidationPipe(schema));
}

export function ZodQuery<TOutput = unknown>(schema: ZodType<TOutput>): ParameterDecorator {
  return Query(new ZodValidationPipe(schema));
}

export function ZodParam<TOutput = unknown>(schema: ZodType<TOutput>): ParameterDecorator {
  return Param(new ZodValidationPipe(schema));
}

export function ZodHeader<TOutput = unknown>(
  name: string,
  schema: ZodType<TOutput>,
): ParameterDecorator {
  return createParamDecorator((_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    return new ZodValidationPipe(schema).transform(request.headers[name.toLowerCase()]);
  })();
}
