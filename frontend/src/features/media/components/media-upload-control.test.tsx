import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { MEDIA_TARGET } from '../types/media.type';

import { MediaUploadControl } from './media-upload-control';

describe('MediaUploadControl', () => {
  it('renders the supported accept list and accessible upload guidance without entity integration', () => {
    const markup = renderToStaticMarkup(
      <MediaUploadControl
        target={{ target: MEDIA_TARGET.PLACE_LOGO, placeId: '550e8400-e29b-41d4-a716-446655440000' }}
      />,
    );
    expect(markup).toContain('image/jpeg,image/png,image/webp,image/avif');
    expect(markup).toContain('Maximum 5 MB');
    expect(markup).toContain('Upload image');
    expect(markup).not.toContain('private_');
  });

  it('shows the authoritative current preview and replacement action', () => {
    const markup = renderToStaticMarkup(
      <MediaUploadControl
        target={{ target: MEDIA_TARGET.PLACE_COVER, placeId: '550e8400-e29b-41d4-a716-446655440000' }}
        label='Cover'
        currentImageUrl='https://ik.example/cover.webp'
      />,
    );
    expect(markup).toContain('https://ik.example/cover.webp');
    expect(markup).toContain('Cover preview');
    expect(markup).toContain('Replace cover');
  });
});
