# Google AdSense: ads.txt setup

The publisher supplied this exact authorization record:

```text
google.com, pub-4267137695035041, DIRECT, f08c47fec0942fa0
```

## Upload this file

1. Download `apps/web/public/ads.txt` from this repository using **Download raw file**.
2. In your hosting file manager, upload it as `public_html/ads.txt`, alongside
   `index.html` and `.htaccess`. Keep the filename lowercase. It is a plain-text
   file, not HTML, and must not be named `ads.txt.txt`.
3. Open <https://specialguardianshipallowance.uk/ads.txt>. You should see the exact
   line above, without a website page, an error, or a login prompt.
4. Return to your site's entry in AdSense and use its available verification or
   update-check action. Google must crawl the uploaded file before its status
   changes; publishing the file does not guarantee immediate detection or approval.

Only this file needs uploading for the ads.txt step. There is no need to replace
your homepage, `site-config.js`, or other files containing your configured GA4
and Search Console values. If an ads.txt file already exists by the time you
upload, retain its valid records and add this line once instead of overwriting it.

The source file is `apps/web/public/ads.txt`. Next.js copies it to the export root,
and `live-site-file.zip` includes it at `ads.txt`. Future readable exports check
that it is present. This single website needs one root ads.txt file; do not put
copies into every page folder or paste the record into an HTML `<head>`.

## Before enabling advertisements

ads.txt declares an authorized seller. It does not install an ad script, display
ads, obtain visitor consent, or grant AdSense site approval.

This site's current banner asks for **Analytics** consent only. It is not an
advertising consent platform. For ads served to visitors in the EEA, UK, and
Switzerland, plan for Google's certified CMP requirements, including TCF
integration. Google's Privacy & messaging tools are one setup option. Check
the current requirements in your AdSense account and the official documentation
before enabling ads; choosing non-personalized ads is not a general substitute
for required consent.

The privacy notice must accurately describe the advertising services, cookies,
data use, and available consent controls. The current Content Security Policy
also allows Analytics hosts only and will need a deliberate update for the
chosen advertising and consent integration. Adding an ad script without those
changes would not complete the setup.

Keep calculator answers and shared-result query strings out of ad requests and
targeting. Do not place ads where they could be mistaken for calculator controls
or cause accidental clicks. Site approval, content policies, traffic quality,
ad placement, and consent requirements still apply after ads.txt is detected.

## Official references and review status

- [Google's ads.txt instructions](https://support.google.com/adsense/answer/7532444?hl=en_US)
- [The Google guidance page requested by the site owner](https://support.google.com/adsense/answer/12171612?hl=en)

The supplied record and file placement are prepared. Reading these live Google
Help pages is still blocked by the development environment's network policy;
access to `support.google.com` has been requested in its configuration draft.
This document does not claim that a full, current Google policy review or
AdSense approval has been completed. No advertising code is enabled by this change.
