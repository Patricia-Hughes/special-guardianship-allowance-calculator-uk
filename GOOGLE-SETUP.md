# Google Analytics and Search Console setup

The upload ZIP preserves your deployed GA4 ID (`G-M4VRDKT4YE`) and Search Console
verification token. No replacement is needed for this update. Both remain
editable; the instructions below explain how to change them later. Advertising
has a separate, disabled-by-default setting described in `ADSENSE-SETUP.md`.

## Google Analytics 4 — edit `public_html/site-config.js`

Find this line:

```js
  ga4MeasurementId: "G-M4VRDKT4YE",
```

Replace only the existing `G-M4VRDKT4YE` value with your new `G-...`
Measurement ID, keeping the quotation marks and comma. In the snippet Google
provided, it is the value after `id=` and in `gtag('config', '...')`. `G-MYTAG` is
an example, not a real ID; the website deliberately ignores it.

**Do not paste the two Google `<script>` tags into every HTML file.** The shared
site loader already adds one Google tag to the page's `<head>` after a visitor
chooses **Yes, that is fine**, or if that browser previously saved a Yes. Adding
another tag would duplicate tracking and bypass the consent controls.

No rebuild is needed when editing this file on your host. In the source repository,
the same file is `apps/web/public/site-config.js`. Keep a copy of your configured
file before uploading a future ZIP, so later deployment changes cannot overwrite it.
The file is served with `Cache-Control: no-store`; clear the hosting/CDN cache if
it applies an additional cache policy.

In GA4, open the property's web data stream and turn **Enhanced measurement off**
for this stream. The website sends its own page-view events with the query string
and fragment removed. This keeps Google's automatic form, search, outbound-link
and browser-history tracking from collecting information outside that intended
scope. Advertising features and Google Signals are disabled in the tag configuration.

To check it:

1. Upload the complete ZIP and confirm `site-config.js` has the intended ID.
2. Open the normal HTTPS website in a private browser window. Do not paste the
   HTML into Chrome's New Tab page using DevTools.
3. Choose **Yes, that is fine**. Check your GA4 property's **Realtime** view; it
   may take a little time for a visit to appear. Ad blockers can block the Google tag.
4. The privacy page lets you turn analytics off and back on. No loads no Google
   tag on later visits; Yes loads it once. The choice is remembered in that browser.
5. If the banner is absent, the browser may already have a saved choice. Use the
   privacy-page controls or another private window. If the ID is still a placeholder,
   the privacy page says analytics are currently off and no banner is shown.

## Search Console — edit `public_html/index.html`

Find this meta tag in the `<head>` section:

```html
<meta name="google-site-verification" content="YOUR_EXISTING_VERIFICATION_TOKEN" />
```

From Google's supplied meta tag, copy **only the value inside `content="..."`**.
Replace **every occurrence** of the existing token
in `index.html` with that value, using your editor's Replace All. Next.js also
includes a copy in its page metadata, so replacing all occurrences keeps both in
sync. Do not paste the whole meta tag inside the quoted content value.

Save and upload `index.html`, then press **Verify** in Search Console. Keep this
meta tag on the homepage after verification. It must be present in the HTML that
the server returns; editing a browser's Elements panel is temporary and cannot
verify site ownership. In the source repository, the token lives in the
`verification.google` metadata field in `apps/web/app/page.tsx`.

The Search Console token does not enable Analytics, and the GA4 ID does not verify
Search Console ownership. Both values are public website configuration, not passwords.
