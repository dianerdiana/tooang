import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { menuCategoriesKeys } from '@/features/menu-categories/queries/menu-categories.query';
import { menuItemsKeys } from '@/features/menu-items/queries/menu-items.query';
import { placesKeys } from '@/features/places/queries/places.key';

import { mediaService } from '../services/media.service';
import { MEDIA_TARGET, type MediaTargetIdentity } from '../types/media.type';

export const refreshMediaTargetData = async (client: QueryClient, target: MediaTargetIdentity) => {
  if (target.target === MEDIA_TARGET.MENU_ITEM_IMAGE) {
    const { placeId, menuItemId } = target;
    await Promise.all([
      client.invalidateQueries({ queryKey: menuItemsKeys.detail(placeId, menuItemId) }),
      client.invalidateQueries({ queryKey: menuItemsKeys.lists(placeId) }),
      client.invalidateQueries({ queryKey: menuCategoriesKeys.lists(placeId) }),
      client.invalidateQueries({ queryKey: placesKeys.managementDetail(placeId) }),
    ]);
    return;
  }
  await Promise.all([
    client.invalidateQueries({ queryKey: placesKeys.managementDetail(target.placeId) }),
    client.invalidateQueries({ queryKey: placesKeys.management() }),
  ]);
};

export const useRefreshMediaTarget = () => {
  const client = useQueryClient();
  return (target: MediaTargetIdentity) => refreshMediaTargetData(client, target);
};

export const useDetachMediaMutation = (target: MediaTargetIdentity) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (target.target === MEDIA_TARGET.PLACE_LOGO) return mediaService.detachPlaceLogo(target.placeId);
      if (target.target === MEDIA_TARGET.PLACE_COVER) return mediaService.detachPlaceCover(target.placeId);
      const menuTarget = target as Extract<MediaTargetIdentity, { target: 'MENU_ITEM_IMAGE' }>;
      return mediaService.detachMenuItemImage(menuTarget.placeId, menuTarget.menuItemId);
    },
    onSuccess: () => refreshMediaTargetData(client, target),
  });
};
