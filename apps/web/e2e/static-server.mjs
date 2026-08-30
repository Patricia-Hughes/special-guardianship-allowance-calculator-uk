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

/** Mirror the .htaccess rules: strip a trailing slash, then try `.html`. */
function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p === '' || p === '/') p = '/index.html';

  const safe = normalize(p).replace(/^(\.\.[/\\])+/, '');
  const direct = join(root, safe);

  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const asHtml = `${direct}.html`;
  if (existsSync(asHtml)) return asHtml;
  const asIndex = join(direct, 'index.html');
  if (existsSync(asIndex)) return asIndex;
  return null;
}

createServer((req, res) => {
  const file = resolve(req.url ?? '/');
  const send = (status, path) => {
    res.writeHead(status, {
      ...HEADERS,
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
    });
    createReadStream(path).pipe(res);
  };

  if (!file) {
    const notFound = join(root, '404.html');
    if (existsSync(notFound)) return send(404, notFound);
    res.writeHead(404, HEADERS);
    return res.end('Not found');
  }
  send(200, file);
}).listen(port, '127.0.0.1', () => {
  console.log(`static-server: serving out/ on http://127.0.0.1:${port} with the production headers`);
});
