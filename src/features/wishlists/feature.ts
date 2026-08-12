import { Gift } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const wishlistsFeature = defineFeature({
  id: 'wishlists',
  title: 'Wishlists',
  basePath: '/wishlists',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/wishlists-list.route').then((m) => ({
          Component: m.WishlistsListRoute,
        })),
    },
    {
      path: ':listId',
      lazy: () =>
        import('./routes/wishlist-detail.route').then((m) => ({
          Component: m.WishlistDetailRoute,
        })),
    },
  ],
  nav: [{ label: 'Wishlists', icon: Gift, to: '/wishlists', order: 210 }],
});
