import { defineFeature } from '@kernel/registry';
import { ShieldCheck } from 'lucide-react';

export const vpnFeature = defineFeature({
  id: 'vpn',
  title: 'Internet',
  basePath: '/vpn',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/vpn.route').then((m) => ({ Component: m.VpnRoute })),
    },
  ],
  nav: [{ label: 'Internet', icon: ShieldCheck, to: '/vpn', order: 120 }],
});
