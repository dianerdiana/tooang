import { redactLogString, redactLogValue } from './winston-logger.service';

describe('Winston logger redaction', () => {
  it('redacts sensitive keys recursively while preserving safe metadata', () => {
    expect(
      redactLogValue({
        requestId: 'request-1',
        authorization: 'Bearer secret',
        nested: { verificationToken: 'secret', passwordHash: 'secret' },
      }),
    ).toEqual({
      requestId: 'request-1',
      authorization: '[REDACTED]',
      nested: { verificationToken: '[REDACTED]', passwordHash: '[REDACTED]' },
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
});
