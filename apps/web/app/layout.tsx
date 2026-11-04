import type { Metadata } from 'next';
import Script from 'next/script';
import '../styles/globals.css';
import '../styles/print.css';
import { SITE_NAME, SITE_URL } from '../lib/jsonLd';
import { RatesStaleBanner } from '../components/ui/RatesStaleBanner';
import { ConsentBanner } from '../components/ui/ConsentBanner';
import { Advertising } from '../components/ui/Advertising';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Special guardianship allowance calculator',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Find out the most your council should be paying you as a special guardian, what the law says it must consider, and what you can do if the figure looks wrong.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  other: { 'google-adsense-account': 'ca-pub-4267137695035041' },
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
        <Script
          id="site-google-config"
          src={`${process.env.SGO_ASSET_ORIGIN || ''}/site-config.js`}
          strategy="beforeInteractive"
        />
        <a className="skip-link" href="#main">
          Skip to the main content
        </a>
        <RatesStaleBanner />

        <header className="masthead print-hide">
          <div className="wrap masthead__inner">
            <a className="masthead__brand" href="/">
              Special guardianship allowance calculator
            </a>
            <nav className="masthead__nav" aria-label="Main">
              <ul>
                <li>
                  <a href="/">Calculator</a>
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

        <main id="main" className="wrap site-main">
          {children}
        </main>

        <footer className="site-footer print-hide">
          <div className="wrap">
            <p>
              This site gives general information, not legal advice. Financial support for special
              guardians is discretionary and your council decides it. Always check anything that
              matters to your case with an adviser.
            </p>
            <nav aria-label="Footer">
              <ul>
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

        <ConsentBanner />
        <Advertising />
      </body>
    </html>
  );
}
