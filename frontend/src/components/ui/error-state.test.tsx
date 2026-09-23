import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { Button } from './button';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('announces the error and renders primary and secondary recovery actions', () => {
    const markup = renderToStaticMarkup(
      <ErrorState
        title='Resource unavailable'
        description='Return to the collection.'
        tone='not-found'
        onRetry={() => undefined}
        secondaryAction={<Button>Back</Button>}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Try again');
    expect(markup).toContain('Back');
    expect(markup).toContain('Resource unavailable');
  });

  it('disables retry and announces retry progress', () => {
    const markup = renderToStaticMarkup(<ErrorState onRetry={() => undefined} isRetrying />);

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Retrying…');
  });
});
