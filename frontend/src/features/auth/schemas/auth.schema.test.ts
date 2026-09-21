import { describe, expect, it } from 'vitest';

import { loginSchema } from './auth.schema';

describe('loginSchema', () => {
  it('normalizes email and defaults rememberMe', () => {
    expect(loginSchema.parse({ email: '  DIAN@Example.COM ', password: 'secret' })).toEqual({
      email: 'dian@example.com',
      password: 'secret',
      rememberMe: false,
    });
  });

  it('does not trim or normalize the password', () => {
    expect(loginSchema.parse({ email: 'dian@example.com', password: ' Secret ' }).password).toBe(' Secret ');
  });

  it.each([
    { email: 'not-an-email', password: 'secret' },
    { email: 'dian@example.com', password: '' },
    { email: `${'a'.repeat(244)}@example.com`, password: 'secret' },
    { email: 'dian@example.com', password: 'a'.repeat(129) },
  ])('rejects invalid login input %#', (credentials) => {
    expect(loginSchema.safeParse(credentials).success).toBe(false);
  });
});
