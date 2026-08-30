# Deploying to Hostinger (or any shared host)

## The short version

**Do not build on Hostinger.** This site is a static export — 2.5 MB of plain
HTML, CSS and JS with no server behind it. Hostinger needs to *serve* those
files, not build them. Every problem below comes from trying to make a shared
host run a Node toolchain it was never set up for.

---

## What the error actually was

```
TypeError [ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING]: A dynamic import callback was not specified.
  at Object.<anonymous> (/home/u652762341/.cache/node/corepack/v1/pnpm/11.24.0/bin/pnpm.cjs:3:1)
  at Module2._compile (/opt/alt/alt-nodejs20/root/usr/lib/node_modules/corepack/dist/lib/corepack.cjs:17340:34)
```

Read the two paths and the cause is in the stack trace:

- `/opt/alt/alt-nodejs20/.../corepack/` — Hostinger's **corepack**, the old copy
  bundled with their Node 20.19.4 (CloudLinux `alt-nodejs20`).
- `.cache/node/corepack/v1/pnpm/11.24.0/pnpm.cjs` — the pnpm it downloaded.

Old corepack loads the package manager through Node's `vm` module without
registering a dynamic-import callback. Modern pnpm builds use `import()` at the
top of their bundle. The moment corepack evaluates that line, Node throws.

**It is not a bug in this repository, and no change to `package.json` fixes
it** — that is why bumping pnpm to 11.24.0, deleting the lockfile and
re-uploading it all failed the same way. The break is between Hostinger's
corepack and *any* recent pnpm. The fix is to stop invoking that code path.

---

## Route 1 — deploy branch (recommended)

GitHub builds the site; Hostinger just checks out finished files. Nothing
installs on the host, so there is no corepack, no pnpm and no Node involved.

1. On GitHub: **Actions → "Deploy static site" → Run workflow**.
   Leave `publish_branch` as `deploy`.
2. In hPanel, point the Git deployment at this repository, branch **`deploy`**,
   with **no build command**, and a target directory of `public_html`.
3. Re-run the workflow whenever you want to publish; hit **Deploy** in hPanel.

The `deploy` branch holds *only* built output — never edit it by hand, and never
develop on it. Source stays on `claude/tool-from-markdown-gremik`.

## Route 2 — upload a zip (no Git setup)

1. **Actions → "Deploy static site" → Run workflow**.
2. When it finishes, download the **`static-site`** artifact from the run page.
3. Unzip and upload the *contents* into `public_html` via hPanel's File Manager
   or FTP.

Make sure hidden files come across — `.htaccess` is what applies the security
headers and makes `/about` work. Most FTP clients hide dotfiles by default.

## Route 3 — build on Hostinger anyway

Only if you have SSH and a reason to. Bypass corepack entirely by installing
pnpm as an ordinary global package, so Node executes it directly instead of
through `vm`:

```bash
npm install -g pnpm@10.33.0
pnpm install --frozen-lockfile
pnpm build
# serve apps/web/out
```

Plain `npm install` in place of pnpm will **not** work here: the root
`package.json` has no `workspaces` field, so npm cannot resolve the
`workspace:*` dependencies on `@sgo/engine` and `@sgo/letters`. Adding npm
support is possible but is a real change, not a config tweak — open an issue if
you want it.

---

## What gets served

The build writes to **`apps/web/out`**. Its contents go at the web root:

```
public_html/
├── .htaccess          ← headers, clean URLs, caching. Easy to lose. Check it.
├── index.html
├── 404.html
├── about.html         ← served at /about
├── guidance/          ← 16 guidance pages
├── _next/static/      ← hashed JS and CSS
├── sitemap.xml
└── robots.txt
```

### After deploying, check these four things

1. `https://yourdomain/` loads and the calculator runs through to a result.
2. `https://yourdomain/about` works **without** `.html` — if it 404s, the
   `.htaccess` did not upload.
3. Headers are live:
   ```bash
   curl -sI https://yourdomain/ | grep -i content-security-policy
   ```
   Nothing back means `.htaccess` is missing or `mod_headers` is off. The site
   will look fine in a browser either way, which is why this is worth checking.
4. Print a result (Ctrl-P) and confirm the figures and the input echo appear.

---

## Why `_headers` and `_redirects` are not enough

Those two files in `apps/web/out` are Cloudflare Pages / Netlify format.
**Apache and LiteSpeed ignore them completely.** Hostinger runs LiteSpeed, so on
Hostinger alone they do nothing.

`apps/web/public/.htaccess` is the Apache translation of the same rules: the
§29.2 security headers, no-trailing-slash canonical URLs (§27), extensionless
paths, a 404 document, immutable caching for hashed assets, and
must-revalidate on HTML so an April rate change cannot sit stale in a cache.

If you ever move to Cloudflare or Netlify, `_headers` and `_redirects` take over
and `.htaccess` is ignored. Keep the header list in the two in step.

---

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Output | `output: 'export'` — static, no Node at runtime |
| Size | ~2.5 MB total; 102 kB shared JS, 146 kB first load on the calculator |
| Requirements to serve | A web server. That is all. |
| Requirements to build | Node 20+ and pnpm 10.33.0 |
