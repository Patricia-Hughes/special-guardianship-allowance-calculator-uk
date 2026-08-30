import type { Metadata } from 'next';
import '../styles/globals.css';
import '../styles/print.css';
import { SITE_NAME, SITE_URL } from '../lib/jsonLd';
import { RatesStaleBanner } from '../components/ui/RatesStaleBanner';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Special guardianship allowance calculator',
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'Find out the most your council should be paying you as a special guardian, what the law says it must consider, and what you can do if the figure looks wrong.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: SITE_NAME,
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main">
          Skip to the main content
        </a>
        <RatesStaleBanner />
        <header className="site-header print-hide" style={{ borderBottom: '1px solid var(--colour-line)' }}>
          <div className="wrap" style={{ padding: '0.75rem 1rem' }}>
            <nav aria-label="Main">
              <ul
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                <li>
                  <a href="/" style={{ fontWeight: 700 }}>
                    Calculator
                  </a>
                </li>
                <li>
                  <a href="/guidance">Guides</a>
                </li>
                <li>
                  <a href="/rates">Rates</a>
                </li>
                <li>
                  <a href="/about">About</a>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main id="main" className="wrap" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
          {children}
        </main>

        <footer className="site-footer print-hide" style={{ borderTop: '1px solid var(--colour-line)' }}>
          <div className="wrap" style={{ padding: '1.5rem 1rem' }}>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>
              This site gives general information, not legal advice. Financial support for special
              guardians is discretionary and your council decides it. Always check anything that
              matters to your case with an adviser.
            </p>
            <nav aria-label="Footer">
              <ul
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                <li><a href="/privacy">Privacy</a></li>
                <li><a href="/terms">Terms of use</a></li>
                <li><a href="/accessibility">Accessibility</a></li>
                <li><a href="/disclaimer">Disclaimer</a></li>
                <li><a href="/about">Editorial policy</a></li>
                <li><a href="/contact">Contact and corrections</a></li>
              </ul>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
