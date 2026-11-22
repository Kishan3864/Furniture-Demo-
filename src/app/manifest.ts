import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WoodBook - Furniture Workshop',
    short_name: 'WoodBook',
    description: 'Orders, measurements, workers, deliveries and payments in one place.',
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
      { name: 'New Order', url: '/orders/new' },
      { name: 'Deliveries', url: '/delivery' },
      { name: 'Work Progress', url: '/board' },
    ],
  };
}
