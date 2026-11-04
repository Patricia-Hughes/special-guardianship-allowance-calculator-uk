# Approved SEO and AdSense audit remediation

Owner approved implementation of the corrected task list from both audit PDFs.
This record distinguishes code changes from account steps and unverified claims.

## SEO tasks

| Audit task | Result |
| --- | --- |
| S1 contextual internal links | Added 32 prose links from the 16 existing guides to `/` and `/rates`, in addition to existing calculator callouts. |
| S2 seven named link placements | Added all seven destinations and contextual uses. Replaced claims of guaranteed entitlement or a universally lawful allowance with qualified estimate wording. |
| S3 related topic links | Added Child Benefit → means-test, retaining the reverse link. Added useful assessment, legal-cost and policy-request links. Existing citation-derived related guides remain. |
| S4 route through hubs | Added relevant calculator/rate links without deleting useful complaints links to satisfy a numerical similarity score. |
| S5 direct openings | Rewrote all 16 introductions with immediate explanations and jurisdictional qualifications; retained first-hand passages. |
| S6 means-test definition | Explicitly distinguishes the non-statutory DfE model's 20% disregard from a universal legal requirement. |
| S7 percentage policies | Explains the need for a reasoned, individual decision without declaring every percentage-based result unlawful. |
| S8 Child Benefit | Distinguishes an appropriate deduction, an Ombudsman finding of fault and a court ruling. |
| S9 Article schema | Retained the existing connected graph, added stable publication dates separate from modification dates, and checked one Article per guide against its visible H1. Previous review dates were not reset merely for an editorial edit. |
| S10 FAQ schema | Retained the existing visible FAQs; the build check now requires exact question/answer parity and prevents duplicate FAQ nodes. No rich-result promise. |
| S11 legal aid guide | Added `/guidance/legal-aid-and-court-costs`, with separate legal aid, court-fee and council-funding routes; jurisdiction-specific official links; practical questions; FAQs and schema. No unverified fee amounts, thresholds or eligibility guarantees. |
| S12 policy tracker guide | Added `/guidance/council-foi-policy-tracker`, with a reusable request template, private record checklist, jurisdiction-specific routes and review advice. It explicitly does not claim a live council database. |
| S13 roadmap | Implemented links, openings/schema, then new guides. Hubs, related content and sitemap derive from published content. No invented ranking or Google authority-score guarantee. |

The new guides use the repository's existing legal/guidance citations and link
to official services for case-specific and current requirements. Direct retrieval
of government and regulator pages was blocked by the development proxy, including
an escalated retry. No source retrieval dates were invented or updated. Current
fees, eligibility thresholds, procedural deadlines and new legal interpretations
were deliberately not asserted. Independent review of the linked current guidance
remains useful before relying on it in an individual case.

## AdSense tasks

| Audit task | Result |
| --- | --- |
| A1 CSP | Added restricted Google advertising/CMP destinations in both hosting formats and their gate. Retained anti-framing, no-form-post, no-referrer and other existing headers. Real network compatibility is pending the published CMP/live checks. |
| A2 privacy | Added advertising, cookies, consent and withdrawal disclosures; removed Analytics-only third-party wording and clarified hosting/contact data. Calculator answers remain excluded. |
| A3 preference links | Added HTTPS links to Google's My Ad Center, AboutAds choices and Your Online Choices. These supplement site consent controls. External destinations could not all be live-verified through the restricted network. |
| A4 certified CMP | Prepared Google's Funding Choices integration and separate advertising controls. Owner answered “I don't know” about a published message, so advertising stays off. Publishing/verifying the message and current Google requirements are outstanding account steps. |
| A5 crawler access | Preserved wildcard `Allow: /`, which already permits all advertising crawlers. Did not invent a crawler identity or misreport the previous robots file as blocking ads. Hosting/WAF treatment still needs live account diagnostics if a crawler reports a failure. |
| A6 author bylines | Linked the shared author byline to `/about`, covering all 18 guides. |
| A7 real author image | Not added: no authentic owner-supplied or otherwise verified portrait/workspace asset is available. No generated or stock image is represented as Patricia. |
| A8 author profiles | Owner answered “none”. Omitted `sameAs` rather than inventing profiles. |
| A9 advertising tag | Prepared one consent-gated tag per eligible editorial page, disabled by default. Added the publisher verification meta tag without loading Google. Excluded calculator/shared URLs; Analytics consent is separate. |
| A10 deployment/review | Deliver readable upload ZIP in the source branch. Owner still uploads it to hosting, completes the AdSense account steps and requests review. No hosting/account action is claimed as completed. |

See [ADSENSE-SETUP.md](../ADSENSE-SETUP.md) for the precise remaining account
steps and verification limits. Google Help access, including the page supplied
by the owner, remained blocked by HTTP 403. Therefore this is not a claim of a
completed current Google policy review or guaranteed AdSense approval.

## Preservation and delivery

- Home title and H1 retained.
- Live GA4 ID `G-M4VRDKT4YE` and the live Search Console token retained.
- Correct `ads.txt` publisher record retained at the ZIP root.
- No changes to allowance data, calculator engine or letter-generation source.
- Original routes retained, with two additional guide pages.
- Source remains readable; `pnpm export:readable` disables JS/CSS minification
  and stores ZIP entries without compression. Existing absolute asset URLs remain.
- No unauthenticated production upload is attempted. The repository ZIP is the
  reviewable deployment artifact; the existing live site changes after upload.

## Verification

- `pnpm verify`: type checks, 273 unit tests, data validation, content checks
  and identical security-header checks passed. Two existing research watchlist
  warnings remain (Welsh consultation outcome and the permanent Lincolnshire
  model source); their review dates were not falsely advanced.
- Final optimized build, lint/type validation, recorded bundle-regression gate
  and schema gate passed. The explicit bundle baseline decision is documented
  in ADR-0005; the regression tolerance remains unchanged.
- Full desktop and mobile Chromium suite: **254 passed**, including all page
  accessibility checks, calculator journeys, form validation, internal links,
  routing, letter downloads, printing and consent.
- Final extracted readable ZIP: **74 additional desktop/mobile checks passed**,
  exercising calculator/letter journeys, Analytics and advertising consent,
  failed/incomplete signals, withdrawal, duplicate prevention, preserved settings,
  the new guides, accessibility, actual headers, a real 404 and redirects.
  ZIP resources were served at the intended production origin by local request
  routing, with the ZIP's CSP, rather than loading stale live assets or disabling
  TLS certificate checks. Ad services were mocked; this is not a live CMP test.
- Readable schema check: **27 public pages**, **18 guide Article/FAQ pairs**,
  **287 resolved entity references**. FAQ text matches the visible content.
- Archive verification: **94 files**, **28 HTML files including 404**, all
  **26 previous HTML files retained** plus the two new guides; **840 internal
  page/asset references resolve**. Existing H1s/titles and live Google settings
  are preserved. Every archive entry uses ordinary `0644` permissions and ZIP
  storage without compression; JavaScript/CSS remain multiline and readable.
- Desktop and mobile screenshots of the extracted new guides were inspected.
  Safari/WebKit is not available in this environment and was not tested.

Delivery: `live-site-file.zip`, **5,236,676 bytes** (4.99 MiB).

SHA-256:

```text
051b0285b298f34e4d19634a4a061573c8a1f2d10f0906193ebeae7b5c151587
```
