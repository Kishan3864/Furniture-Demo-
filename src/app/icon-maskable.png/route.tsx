import { iconResponse } from '@/lib/icon-image';

export const dynamic = 'force-static';

export function GET() {
  return iconResponse(512, true);
}
