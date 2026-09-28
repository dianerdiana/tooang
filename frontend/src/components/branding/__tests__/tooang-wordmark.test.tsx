import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { TooangWordmark } from '../tooang-wordmark';

describe('TooangWordmark', () => {
  it('renders accessible product text with semantic brand styling', () => {
    const markup = renderToStaticMarkup(<TooangWordmark />);

    expect(markup).toContain('Tooang');
    expect(markup).toContain('text-primary');
    expect(markup).toContain('font-[750]');
    expect(markup).not.toContain('<img');
  });

  it('supports header and auth sizes with caller styling', () => {
    expect(renderToStaticMarkup(<TooangWordmark size='header' />)).toContain('text-xl');
    expect(renderToStaticMarkup(<TooangWordmark size='auth' className='mb-3' />)).toContain('text-3xl');
    expect(renderToStaticMarkup(<TooangWordmark size='auth' className='mb-3' />)).toContain('mb-3');
  });
});
