import { type MockInstance, vi } from 'vitest';

import { api } from '@/configs/api-config';

import type {
  ApiDataResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiPaginationMeta,
  ApplicationError,
} from '@/types/api-response.type';

import { registerTestCleanup } from './test-resources';

type AsyncMethod = (...args: never[]) => Promise<unknown>;
type AsyncMethodName<TService> = {
  [TKey in keyof TService]: TService[TKey] extends AsyncMethod ? TKey : never;
}[keyof TService];
type AsyncMethodResult<TMethod> = TMethod extends (...args: never[]) => Promise<infer TResult> ? TResult : never;

export function mockServiceSuccess<TService extends object, TMethod extends AsyncMethodName<TService>>(
  service: TService,
  method: TMethod,
  value: AsyncMethodResult<TService[TMethod]>,
): MockInstance<AsyncMethod> {
  const target = service as Record<PropertyKey, AsyncMethod>;
  const spy = vi.spyOn(target, method).mockResolvedValue(value as never);
  registerTestCleanup(() => spy.mockRestore());
  return spy;
}

export function mockServiceFailure<TService extends object, TMethod extends AsyncMethodName<TService>>(
  service: TService,
  method: TMethod,
  error: ApplicationError | Error,
): MockInstance<AsyncMethod> {
  const target = service as Record<PropertyKey, AsyncMethod>;
  const spy = vi.spyOn(target, method).mockRejectedValue(error);
  registerTestCleanup(() => spy.mockRestore());
  return spy;
}

export const apiSuccessResponse = <TData>({
  message,
  data,
}: {
  message: string;
  data: TData;
}): ApiDataResponse<TData> => ({ error: false, message, data });

export const apiPaginatedResponse = <TData>({
  message,
  data,
  meta,
}: {
  message: string;
  data: TData;
  meta: ApiPaginationMeta;
}): ApiPaginatedResponse<TData> => ({ error: false, message, data, meta });

export const apiErrorResponse = (response: ApiErrorResponse): ApiErrorResponse => response;

export const applicationError = (error: ApplicationError): ApplicationError => error;

export function blockUnexpectedApiRequests() {
  const unexpected = (method: string) =>
    new Error(`Unexpected ${method} request in a DOM test; mock the feature service`);
  const spies = {
    get: vi.spyOn(api, 'get').mockRejectedValue(unexpected('GET')),
    post: vi.spyOn(api, 'post').mockRejectedValue(unexpected('POST')),
    put: vi.spyOn(api, 'put').mockRejectedValue(unexpected('PUT')),
    patch: vi.spyOn(api, 'patch').mockRejectedValue(unexpected('PATCH')),
    delete: vi.spyOn(api, 'delete').mockRejectedValue(unexpected('DELETE')),
  };

  registerTestCleanup(() => Object.values(spies).forEach((spy) => spy.mockRestore()));
  return spies;
}
