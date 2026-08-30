/**
 * Verify the security headers file ships with every header spec §29.2 requires.
 *
 * A static site's headers live in a config file that nothing else references,
 * which makes them exactly the kind of thing that silently disappears in a
 * reorganisation. This check notices.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const headersPath = join(root, 'apps', 'web', 'public', '_headers');

if (!existsSync(headersPath)) {
  console.error('check-security-headers: apps/web/public/_headers is missing.');
  process.exit(1);
}

const text = readFileSync(headersPath, 'utf8');

const REQUIRED: Array<[string, RegExp]> = [
  ['Content-Security-Policy', /Content-Security-Policy:/],
  ["CSP default-src 'self'", /default-src 'self'/],
  ["CSP script-src 'self'", /script-src 'self'/],
  ['CSP connect-src allows only postcodes.io', /connect-src 'self' https:\/\/api\.postcodes\.io/],
  ["CSP frame-ancestors 'none'", /frame-ancestors 'none'/],
  ["CSP base-uri 'self'", /base-uri 'self'/],
  ["CSP form-action 'none'", /form-action 'none'/],
  ['Strict-Transport-Security', /Strict-Transport-Security: max-age=63072000; includeSubDomains; preload/],
  ['X-Content-Type-Options', /X-Content-Type-Options: nosniff/],
  ['Referrer-Policy', /Referrer-Policy: no-referrer/],
  ['Permissions-Policy', /Permissions-Policy: geolocation=\(\), camera=\(\), microphone=\(\), interest-cohort=\(\)/],
  ['X-Frame-Options', /X-Frame-Options: DENY/],
];

const missing = REQUIRED.filter(([, re]) => !re.test(text)).map(([name]) => name);

if (missing.length > 0) {
  console.error('check-security-headers: missing or altered headers\n');
  for (const m of missing) console.error(`  ✗ ${m}`);
  process.exit(1);
}

// connect-src must not have quietly grown a new host.
const connectSrc = /connect-src ([^;]+);/.exec(text)?.[1] ?? '';
const allowedHosts = new Set(["'self'", 'https://api.postcodes.io']);
for (const host of connectSrc.trim().split(/\s+/)) {
  if (!allowedHosts.has(host)) {
    console.error(
      `check-security-headers: connect-src allows "${host}", which is not in the approved set.\n` +
        '  [R8] No user financial or family data may leave the browser. Adding an outbound\n' +
        '  host is a decision that needs a human, not a config edit.',
    );
    process.exit(1);
  }
}

console.log('check-security-headers: all required headers present and connect-src unchanged.');
