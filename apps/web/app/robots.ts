import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/jsonLd';

export const dynamic = 'force-static';

/**
 * Allow everything. There is nothing here that should not be indexed, the whole
 * point is that a carer searching for their council's name finds this.
 *
 * Staging environments set NEXT_PUBLIC_NOINDEX=1 so a preview deploy cannot be
 * indexed alongside production (§27: "no staging leaks").
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_NOINDEX === '1') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
