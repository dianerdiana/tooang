import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { menuCategoriesKeys } from '@/features/menu-categories/queries/menu-categories.query';
import { menuItemsKeys } from '@/features/menu-items/queries/menu-items.query';
import { placesKeys } from '@/features/places/queries/places.key';

import { MEDIA_TARGET } from '../types/media.type';

import { refreshMediaTargetData } from './media-association.mutation';

describe('media association cache refresh', () => {
  it('refreshes place detail and management lists for place media', async () => {
    const client = new QueryClient();
    const detail = placesKeys.managementDetail('place-1');
    const list = placesKeys.managementList({});
    client.setQueryData(detail, { logoUrl: 'old' });
    client.setQueryData(list, { places: [] });

    await refreshMediaTargetData(client, { target: MEDIA_TARGET.PLACE_LOGO, placeId: 'place-1' });

    expect(client.getQueryState(detail)?.isInvalidated).toBe(true);
    expect(client.getQueryState(list)?.isInvalidated).toBe(true);
  });

  it('refreshes menu detail, lists, categories, and place detail for item images', async () => {
    const client = new QueryClient();
    const keys = [
      menuItemsKeys.detail('place-1', 'item-1'),
      menuItemsKeys.list('place-1', {}),
      menuCategoriesKeys.list('place-1', {}),
      placesKeys.managementDetail('place-1'),
    ];
    keys.forEach((key) => client.setQueryData(key, {}));

    await refreshMediaTargetData(client, {
      target: MEDIA_TARGET.MENU_ITEM_IMAGE,
      placeId: 'place-1',
      menuItemId: 'item-1',
    });

    keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  });
});
