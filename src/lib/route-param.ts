'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';

/** Placeholder id used for statically exported dynamic routes (see firebase.json rewrites). */
export const ROUTE_PLACEHOLDER = '_';

const usable = (v?: string | null) => (v && v !== ROUTE_PLACEHOLDER ? decodeURIComponent(v) : '');

/**
 * Read a dynamic route segment so it works both in `next dev` and in the static export
 * served by Firebase Hosting (where every /orders/:id is rewritten to /orders/_).
 * @param name   param name, e.g. "id"
 * @param index  segment index in the pathname, e.g. 2 for /orders/[id]
 */
export function useRouteParam(name: string, index: number): string {
  const params = useParams();
  const pathname = usePathname();
  const raw = params?.[name];
  const fromParams = usable(Array.isArray(raw) ? raw[0] : raw);
  const fromPath = usable((pathname || '').split('/')[index]);
  const [fromWindow, setFromWindow] = useState('');

  useEffect(() => {
    setFromWindow(usable(window.location.pathname.split('/')[index]));
  }, [pathname, index]);

  return fromParams || fromPath || fromWindow;
}
