import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MEDIA_TARGET } from '../types/media.type';

import { MediaManagementPanel } from './media-management-panel';

const renderPanel = (canUpload: boolean, canRemove: boolean, currentImageUrl: string | null = 'https://ik/image') =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MediaManagementPanel
        target={{ target: MEDIA_TARGET.PLACE_LOGO, placeId: 'place-1' }}
        label='Logo'
        currentImageUrl={currentImageUrl}
        canUpload={canUpload}
        canRemove={canRemove}
      />
    </QueryClientProvider>,
  );

describe('MediaManagementPanel', () => {
  it('gates replacement and confirmed removal independently', () => {
    expect(renderPanel(false, false)).not.toContain('Replace logo');
    expect(renderPanel(true, false)).toContain('Replace logo');
    expect(renderPanel(false, true)).toContain('Remove logo');
  });

  it('does not offer removal for an empty association', () => {
    const markup = renderPanel(false, true, null);
    expect(markup).toContain('No logo');
    expect(markup).not.toContain('Remove logo');
  });
});
