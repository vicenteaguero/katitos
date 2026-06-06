import { ThumbsUp } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { WishlistsListRoute } from './routes/wishlists-list.route';
import { WishlistDetailRoute } from './routes/wishlist-detail.route';

export const wishlistsFeature = defineFeature({
  id: 'wishlists',
  title: 'Wishlists',
  basePath: '/wishlists',
  routes: [
    { index: true, Component: WishlistsListRoute },
    { path: ':listId', Component: WishlistDetailRoute },
  ],
  nav: [{ label: 'Wishlists', icon: ThumbsUp, to: '/wishlists', order: 210 }],
});
