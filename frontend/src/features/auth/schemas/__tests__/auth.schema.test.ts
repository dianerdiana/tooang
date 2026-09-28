import { describe, expect, it } from 'vitest';

import { loginSchema, registerFormSchema, registerSchema } from '../auth.schema';

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

  it('counts Unicode code points rather than UTF-16 code units', () => {
    expect(loginSchema.safeParse({ email: 'dian@example.com', password: '😀'.repeat(128) }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'dian@example.com', password: '😀'.repeat(129) }).success).toBe(false);
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

describe('registration schemas', () => {
  it('normalizes identity fields and does not expose confirmation to the API DTO', () => {
    const form = registerFormSchema.parse({
      fullName: '  Dian Erdiana ',
      email: ' DIAN@EXAMPLE.COM ',
      password: 'unique passphrase',
      confirmPassword: 'unique passphrase',
    });
    expect(registerSchema.parse(form)).toEqual({
      fullName: 'Dian Erdiana',
      email: 'dian@example.com',
      password: 'unique passphrase',
    });
  });

  it('rejects mismatched password confirmation', () => {
    expect(
      registerFormSchema.safeParse({
        fullName: 'Dian',
        email: 'dian@example.com',
        password: 'unique passphrase',
        confirmPassword: 'different passphrase',
      }).success,
    ).toBe(false);
  });

  it('preserves password whitespace exactly and counts Unicode limits', () => {
    const password = '  😀😀😀😀  ';
    expect(registerSchema.parse({ fullName: 'Dian', email: 'dian@example.com', password }).password).toBe(password);
    expect(
      registerSchema.safeParse({ fullName: '😀'.repeat(100), email: 'dian@example.com', password: 'abcdefgh' }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({ fullName: '😀'.repeat(101), email: 'dian@example.com', password: 'abcdefgh' }).success,
    ).toBe(false);
  });
});
