import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { ReadOnlyHour } from './business-hours-page';

describe('business hours display semantics', () => {
  it('labels closed days clearly', () => {
    const markup = renderToStaticMarkup(
      <ReadOnlyHour hour={{ day: 'MONDAY', isClosed: true, opensAt: null, closesAt: null }} />,
    );
    expect(markup).toContain('Closed');
  });

  it('labels an overnight range as closing the next day', () => {
    const markup = renderToStaticMarkup(
      <ReadOnlyHour hour={{ day: 'FRIDAY', isClosed: false, opensAt: '22:00', closesAt: '02:00' }} />,
    );
    expect(markup).toContain('22:00');
    expect(markup).toContain('02:00');
    expect(markup).toContain('Overnight · closes next day');
  });
});
