import { redactLogString, redactLogValue } from './winston-logger.service';

describe('Winston logger redaction', () => {
  it('redacts sensitive keys recursively while preserving safe metadata', () => {
    expect(
      redactLogValue({
        requestId: 'request-1',
        authorization: 'Bearer secret',
        nested: {
          verificationToken: 'secret',
          passwordHash: 'secret',
          database_url: 'postgresql://user:password@host/database',
          providerResponse: { body: 'private' },
        },
      }),
    ).toEqual({
      requestId: 'request-1',
      authorization: '[REDACTED]',
      nested: {
        verificationToken: '[REDACTED]',
        passwordHash: '[REDACTED]',
        database_url: '[REDACTED]',
        providerResponse: '[REDACTED]',
      },
    });
  });

  it('redacts verification URLs, bearer/JWT values, and opaque 32-byte tokens', () => {
    const token = 'A'.repeat(43);
    const value = redactLogString(
      `GET /order-verifications/${token} Bearer ${token} eyJabc.def.ghi TNG-20260915-ABCDEFGH`,
    );
    expect(value).not.toContain(token);
    expect(value).not.toContain('eyJabc.def.ghi');
    expect(value).not.toContain('TNG-20260915-ABCDEFGH');
    expect(value).toContain('/order-verifications/[REDACTED]');
  });

  it('redacts database URLs in messages and safely handles cyclic metadata', () => {
    expect(redactLogString('failed postgresql://user:password@database/app')).not.toContain(
      'password',
    );
    const cyclic: Record<string, unknown> = { event: 'failure' };
    cyclic.cause = cyclic;
    expect(redactLogValue(cyclic)).toEqual({ event: 'failure', cause: '[REDACTED_CYCLE]' });
  });
});
