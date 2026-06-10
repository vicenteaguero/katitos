import { Album } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { AlbumRoute } from './routes/album.route';

export const albumFeature = defineFeature({
  id: 'album',
  title: 'Pololini Album',
  basePath: '/album',
  routes: [{ index: true, Component: AlbumRoute }],
  nav: [{ label: 'Album', icon: Album, to: '/album', order: 15 }],
});
