import type { MetadataRoute } from 'next';
import { allContent } from '../lib/content';
import { SITE_URL } from '../lib/jsonLd';

export const dynamic = 'force-static';

const STATIC_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'monthly' as const },
  { path: '/guidance', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/rates', priority: 0.8, changeFrequency: 'yearly' as const },
  { path: '/about', priority: 0.5, changeFrequency: 'yearly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/accessibility', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/disclaimer', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/contact', priority: 0.3, changeFrequency: 'yearly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const guides = allContent('guidance').map((d) => ({
    url: `${SITE_URL}/guidance/${d.frontmatter.slug}`,
    lastModified: new Date(`${d.frontmatter.lastUpdated}T00:00:00Z`),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${SITE_URL}${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...guides,
  ];
}
