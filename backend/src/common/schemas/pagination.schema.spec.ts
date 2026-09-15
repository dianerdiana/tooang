import { paginationSchema } from './pagination.schema';

describe('paginationSchema', () => {
  it('applies shared defaults and accepts the maximum page size', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationSchema.parse({ page: '2', limit: '100' })).toEqual({ page: 2, limit: 100 });
  });

  it.each([{ page: 0 }, { limit: 0 }, { limit: 101 }, { page: 1.5 }])(
    'rejects invalid pagination input %#',
    (input) => expect(() => paginationSchema.parse(input)).toThrow(),
  );
});
