/**
 * Verify the security headers spec §29.2 requires ship on every host we target.
 *
 * A static site's headers live in a config file that nothing else references,
 * which makes them exactly the kind of thing that silently disappears in a
 * reorganisation. This check notices.
 *
 * There are two such files, because no single format is understood everywhere:
 *
 *   public/_headers   Cloudflare Pages, Netlify.
 *   public/.htaccess  Apache, LiteSpeed — which is what Hostinger and most
 *                     shared cPanel hosts run. They ignore _headers entirely.
 *
 * Both must carry the same headers with the same values. A site missing its
 * headers looks completely normal in a browser, so drift between the two is
 * invisible until someone thinks to run `curl -I` against production. This
 * check is that someone.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'apps', 'web', 'public');

type Headers = Map<string, string>;

/** `_headers` format: `  Name: value`, indented under a `/*` path block. */
function parseHeadersFile(text: string): Headers {
  const out: Headers = new Map();
  for (const line of text.split('\n')) {
    if (/^\s*#/.test(line) || !/^\s+\S/.test(line)) continue;
    const m = /^\s+([A-Za-z-]+):\s*(.+?)\s*$/.exec(line);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

/** `.htaccess` format: `Header always set Name "value"`. */
function parseHtaccess(text: string): Headers {
  const out: Headers = new Map();
  for (const line of text.split('\n')) {
    if (/^\s*#/.test(line)) continue;
    const m = /^\s*Header\s+always\s+set\s+([A-Za-z-]+)\s+"(.*)"\s*$/.exec(line);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

const sources: Array<{ label: string; path: string; parse: (t: string) => Headers }> = [
  { label: 'public/_headers', path: join(publicDir, '_headers'), parse: parseHeadersFile },
  { label: 'public/.htaccess', path: join(publicDir, '.htaccess'), parse: parseHtaccess },
];

const parsed: Array<{ label: string; headers: Headers }> = [];
for (const { label, path, parse } of sources) {
  if (!existsSync(path)) {
    console.error(`check-security-headers: apps/web/${label} is missing.`);
    process.exit(1);
  }
  parsed.push({ label, headers: parse(readFileSync(path, 'utf8')) });
}

// The Google hosts are here because the site runs Google Analytics behind
// consent. They are the only third party besides the postcode lookup, and they
// earn their place only while analytics is wanted: if it is ever removed, take
// them out of both header files and out of this constant in the same change,
// or the policy stays wider than the site needs.
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: https://www.googletagmanager.com https://www.google-analytics.com; " +
  "connect-src 'self' https://api.postcodes.io https://www.google-analytics.com " +
  "https://*.google-analytics.com https://*.analytics.google.com " +
  "https://www.googletagmanager.com; " +
  "frame-ancestors 'none'; base-uri 'self'; form-action 'none'";

const REQUIRED: Array<[string, string]> = [
  ['Content-Security-Policy', CSP],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'no-referrer'],
  ['Permissions-Policy', 'geolocation=(), camera=(), microphone=(), interest-cohort=()'],
  ['X-Frame-Options', 'DENY'],
];

const problems: string[] = [];

for (const { label, headers } of parsed) {
  for (const [name, expected] of REQUIRED) {
    const actual = headers.get(name);
    if (actual === undefined) {
      problems.push(`${label}: ${name} is missing`);
    } else if (actual !== expected) {
      problems.push(`${label}: ${name} does not match\n      expected: ${expected}\n      actual:   ${actual}`);
    }
  }
}

if (problems.length > 0) {
  console.error('check-security-headers: headers missing or altered\n');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    '\n  Both files must carry the same headers. A host only reads one of them,\n' +
      '  so a header dropped from either is a header missing in production.',
  );
  process.exit(1);
}

/**
 * Directives Apache refuses to parse inside a .htaccess file.
 *
 * This is not a style rule. Apache allows these only in the server config or a
 * virtual host; finding one in .htaccess is a fatal parse error and the server
 * answers EVERY request under that directory with a 500. The whole site, not
 * one page, and it looks fine in every test because nothing here runs Apache.
 *
 * A <Directory> block shipped in this file once. It was written to scope a
 * caching rule, it read as reasonable, and it would have taken the site down on
 * Hostinger and every other shared cPanel host the moment it was uploaded. The
 * headers check already reads this file, so it is the natural place to also
 * read it as what it is: Apache configuration.
 *
 * Legal container directives in .htaccess are <Files>, <FilesMatch>, <If>,
 * <IfModule>, <IfDefine>, <IfVersion>, <Limit>, <LimitExcept> and <RequireAll>
 * and friends. Everything below is not.
 */
const FORBIDDEN_IN_HTACCESS = [
  'Directory',
  'DirectoryMatch',
  'VirtualHost',
  'Location',
  'LocationMatch',
  'Proxy',
  'ProxyMatch',
];

{
  const htaccess = readFileSync(join(publicDir, '.htaccess'), 'utf8');
  const offences: string[] = [];
  htaccess.split('\n').forEach((line, i) => {
    if (/^\s*#/.test(line)) return;
    const m = /^\s*<\/?([A-Za-z]+)/.exec(line);
    if (m && FORBIDDEN_IN_HTACCESS.includes(m[1]!)) {
      offences.push(`line ${i + 1}: <${m[1]}> — ${line.trim()}`);
    }
  });
  if (offences.length > 0) {
    console.error(
      'check-security-headers: public/.htaccess contains a directive Apache does not\n' +
        '  allow in a .htaccess file. This is not cosmetic: Apache treats it as a fatal\n' +
        '  parse error and returns 500 for every page on the site.\n',
    );
    for (const o of offences) console.error(`  ✗ ${o}`);
    console.error(
      '\n  Only <Files>, <FilesMatch>, <If> and <IfModule> may be used here. To scope a\n' +
        '  rule to a path, set an environment variable with mod_rewrite and key the\n' +
        '  directive off it, which is what the caching block does.',
    );
    process.exit(1);
  }
}

// connect-src must not have quietly grown a new host, in either file.
// Every host the browser may talk to: the postcode lookup, and Google
// Analytics. [R8] still holds. Nothing a carer types reaches either of them.
const allowedHosts = new Set([
  "'self'",
  'https://api.postcodes.io',
  'https://www.google-analytics.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://www.googletagmanager.com',
]);
for (const { label, headers } of parsed) {
  const connectSrc = /connect-src ([^;]+);/.exec(headers.get('Content-Security-Policy') ?? '')?.[1] ?? '';
  for (const host of connectSrc.trim().split(/\s+/)) {
    if (!allowedHosts.has(host)) {
      console.error(
        `check-security-headers: ${label} connect-src allows "${host}", which is not in the approved set.\n` +
          '  [R8] No user financial or family data may leave the browser. Adding an outbound\n' +
          '  host is a decision that needs a human, not a config edit.',
      );
      process.exit(1);
    }
  }
}

console.log(
  `check-security-headers: all ${REQUIRED.length} required headers present and identical ` +
    `across ${parsed.map((p) => p.label).join(' and ')}; connect-src holds only approved hosts; ` +
    '.htaccess uses no directive Apache forbids there.',
);
