import { z } from 'zod';

const placeSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .max(100);

export type CustomerOrderDetailSearch = {
  placed?: true;
  place?: string;
};

export const parseCustomerOrderDetailSearch = (search: Record<string, unknown>): CustomerOrderDetailSearch => {
  const placed = search.placed === true || search.placed === 'true' ? true : undefined;
  const placeResult = placeSlugSchema.safeParse(search.place);
  return {
    ...(placed ? { placed } : {}),
    ...(placeResult.success ? { place: placeResult.data } : {}),
  };
};
