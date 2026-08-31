/**
 * The static server the end-to-end tests run against.
 *
 * It exists because a plain file server let a broken Content-Security-Policy
 * ship. `check-security-headers` verified the TEXT of the policy and passed;
 * every browser test passed too, because nothing applied the policy to them.
 * In production the CSP blocked Next.js's own inline hydration scripts and
 * every page rendered for a moment and then went blank.
 *
 * So this server reads public/_headers — the real file, not a copy — and
 * applies it. The tests now run under the policy that ships, and a CSP that
 * breaks the site breaks the build instead.
 *
 * It also mirrors the .htaccess URL rules, so /about resolves the way it does
 * on Apache rather than only in a test.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = new URL('../out/', import.meta.url).pathname;
const headersFile = new URL('../public/_headers', import.meta.url).pathname;
const port = Number(process.argv[2] ?? 4321);

/** Parse the `/*` block of a Cloudflare/Netlify `_headers` file. */
function productionHeaders() {
  const out = {};
  for (const line of readFileSync(headersFile, 'utf8').split('\n')) {
    if (/^\s*#/.test(line) || !/^\s+\S/.test(line)) continue;
    const m = /^\s+([A-Za-z-]+):\s*(.+?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  if (!out['Content-Security-Policy']) {
    throw new Error('static-server: no CSP found in public/_headers — refusing to serve without it');
  }
  return out;
}

const HEADERS = productionHeaders();

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * Mirror the .htaccess rules exactly, redirects included.
 *
 * Resolving straight to a file is what let an infinite redirect reach
 * production: /guidance is both a page and a folder, Apache's mod_dir bounced
 * it to /guidance/, and the trailing-slash rule bounced it back. This server
 * resolved it in one step and saw nothing wrong. So it now models the same
 * three rules, in the same order, and returns the same 301s.
 *
 * Returns either {redirect} or {file}, or null for a 404.
 */
function resolve(urlPath) {
  const raw = decodeURIComponent(urlPath.split('?')[0]);

  // Rule 1: canonical URLs carry no trailing slash.
  if (raw.length > 1 && raw.endsWith('/')) {
    return { redirect: raw.replace(/\/+$/, '') || '/' };
  }

  const p = raw === '' ? '/' : raw;
  if (p === '/') return { file: join(root, 'index.html') };

  const safe = normalize(p).replace(/^(\.\.[/\\])+/, '');
  const target = join(root, safe);

  // A real file wins outright (the `!-f` guard).
  if (existsSync(target) && statSync(target).isFile()) return { file: target };

  // Rule 2: path.html, whether or not a folder of the same name exists.
  const asHtml = `${target}.html`;
  if (existsSync(asHtml)) return { file: asHtml };

  // Rule 3: a folder with no page of its own is not browsable.
  if (existsSync(target) && statSync(target).isDirectory()) return null;

  return null;
}

createServer((req, res) => {
  const send = (status, path) => {
    res.writeHead(status, {
      ...HEADERS,
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
    });
    createReadStream(path).pipe(res);
  };

  const outcome = resolve(req.url ?? '/');

  if (outcome && outcome.redirect) {
    const query = (req.url ?? '').includes('?') ? `?${(req.url ?? '').split('?')[1]}` : '';
    res.writeHead(301, { ...HEADERS, Location: outcome.redirect + query });
    return res.end();
  }

  if (!outcome) {
    const notFound = join(root, '404.html');
    if (existsSync(notFound)) return send(404, notFound);
    res.writeHead(404, HEADERS);
    return res.end('Not found');
  }
  send(200, outcome.file);
}).listen(port, '127.0.0.1', () => {
  console.log(`static-server: serving out/ on http://127.0.0.1:${port} with the production headers`);
});
