import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WoodBook - Furniture Workshop',
    short_name: 'WoodBook',
    description: 'Orders, naap, karigar, delivery aur payments - ek jagah.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fdf8ee',
    theme_color: '#7c4a2a',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Naya Order', url: '/orders/new' },
      { name: 'Delivery', url: '/delivery' },
      { name: 'Kaam kahan tak', url: '/board' },
    ],
  };
}
