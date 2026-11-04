# AdSense setup and remaining account steps

The upload package includes your root `ads.txt` record and the
`google-adsense-account` verification meta tag:

```text
google.com, pub-4267137695035041, DIRECT, f08c47fec0942fa0
```

**Advertising is disabled in `site-config.js`.** Keep `adsenseEnabled: false`
until the account and live checks below are complete. You answered that you do
not know whether a European regulations message has been published. The site
must not infer permission to serve ads from that answer or from Analytics consent.

## What is prepared

- One optional AdSense script for `ca-pub-4267137695035041`, inserted into the
  head only on clean guide and rate URLs after a completed positive CMP signal.
- Google Privacy & messaging/Funding Choices integration and a separate
  **Change advertising choices** control on `/privacy` when available.
- No AdSense or advertising CMP on the calculator, other non-editorial pages,
  or URLs containing query strings or fragments. Privacy loads only consent
  management, never an ad script.
- Missing, failed or incomplete consent signals do not enable an ad request.
  Withdrawing consent on an ad page reloads it so previously executed ad code
  cannot continue running in that document.
- Updated privacy disclosures and an additive CSP for the prepared integration,
  in both `.htaccess` and `_headers`. Anti-framing and form-post protections remain.
- `robots.txt` already allows all crawlers. There was no robots exclusion to fix.
  The PDF's unverified crawler name has not been copied into the configuration.

The site's own Analytics Yes/No banner controls Analytics only. It is not a
certified advertising CMP. The advertising code reads the certified CMP's TCF
API; it does not create consent strings or replace Google's interpretation of
the complete consent signal.

## In your AdSense account

1. Open **Privacy & messaging → European regulations**. Check whether a message
   exists and is published for `specialguardianshipallowance.uk`. If not, create
   one for this site and publish it using Google's current account instructions.
2. Set the privacy URL to `https://specialguardianshipallowance.uk/privacy`.
   Configure consent/refusal and choice-management options according to the
   current Google requirements for the EEA, UK and Switzerland. Check the
   currently required TCF version and the CMP's certification status there.
3. Review the current Google Help pages below, including the page you supplied.
   Confirm the Funding Choices implementation against the code Google currently
   provides for this publisher; update the integration if that generated code
   differs. Do not paste a second CMP or AdSense tag into the HTML.
4. In **Sites**, use the verification method available for your site. The
   publisher meta tag and ads.txt are already in this package. Check that
   `https://specialguardianshipallowance.uk/ads.txt` returns the exact text above
   with HTTP 200, not a login, error page or HTML wrapper.
5. Once the site is eligible, request review using the action shown in your
   account. Google decides whether to approve the site; these changes do not
   guarantee approval, rankings, revenue or a review date.

## Before turning ads on for visitors

Use a controlled preview with your published CMP message and the current Google
integration, without making ad clicks or generating artificial traffic. Confirm:

- The real CMP loads under the deployed CSP. There are no blocked CMP/ad
  resources, and Accept, Refuse, manage choices and withdrawal work on desktop
  and mobile. Use the browser Network and Console panels to check.
- A fresh visitor loads no AdSense tag until the required consent is reported.
  Refusal, an unavailable CMP and a reload after refusal load no AdSense tag.
- `/privacy` can reopen the certified consent message. Changing an Analytics
  choice does not change advertising consent or the reverse.
- Calculator and shared-result URLs make no advertising/CMP requests. Keep
  Google Analytics Enhanced measurement off as described in `GOOGLE-SETUP.md`.
- There is only one AdSense script in the applicable document. The actual Google
  message, cookie behavior and network requests match the privacy notice.
- If using Auto ads, exclude the calculator and non-editorial routes in the
  AdSense account too. Review placements; ads must be identifiable and must not
  obscure navigation, resemble calculator buttons or encourage accidental clicks.

Only after those checks, set `adsenseEnabled: true` in
`public_html/site-config.js`. Retain the existing GA4 ID. If a real CMP or CSP
check fails, keep the flag false and correct the specific integration problem;
do not remove the CSP wholesale. Rollback is setting the flag false and reloading.

## Official references and limitations

- [Owner-supplied Google guidance](https://support.google.com/adsense/answer/12171612?hl=en)
- [Google ads.txt instructions](https://support.google.com/adsense/answer/7532444?hl=en)
- [Google's consent-management requirements](https://support.google.com/adsense/answer/13554116?hl=en)
- [Google privacy policy](https://policies.google.com/privacy)
- [Google advertising technologies](https://policies.google.com/technologies/ads)

Direct access to Google Help remained blocked by the development network proxy
(HTTP 403), including the escalated retry. The needed domains were saved in the
cloud environment configuration draft, but saving a draft did not grant runtime
access. The official current-policy review and real account/CMP/ad-network tests
are outstanding. Automated browser tests use mocked CMP/AdSense responses to
verify this site's gating and withdrawal logic; they cannot certify Google
policy compliance or prove the live Google integration works.
