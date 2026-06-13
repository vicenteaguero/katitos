import { Album } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const albumFeature = defineFeature({
  id: 'album',
  title: 'Pololini Album',
  basePath: '/album',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/album.route').then((m) => ({
          Component: m.AlbumRoute,
        })),
    },
  ],
  nav: [{ label: 'Album', icon: Album, to: '/album', order: 15 }],
});
