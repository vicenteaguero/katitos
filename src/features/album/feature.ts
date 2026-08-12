import { BookHeart } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const albumFeature = defineFeature({
  id: 'album',
  title: 'Albums',
  basePath: '/album',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/albums.route').then((m) => ({
          Component: m.AlbumsRoute,
        })),
    },
    {
      path: ':bookId',
      lazy: () =>
        import('./routes/album.route').then((m) => ({
          Component: m.AlbumRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Albums',
      icon: BookHeart,
      to: '/album',
      order: 15,
      placement: 'primary',
    },
  ],
});
