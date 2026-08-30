# Monitoring and alerting

From spec §38.

**The rule that matters most here:** never alert on user-behaviour metrics.
Conversion dashboards create pressure to optimise for engagement over accuracy,
and on this product that is a direct conflict with R7. There is no funnel to
improve. A carer who reads one page, learns their council's ceiling, prints it
and never comes back is a complete success.

---

## What to alert on

| Signal | Threshold | Action |
|---|---|---|
| `RATES_STALE` flag firing in production | **Any occurrence** | Page the owner. Rates are past `effectiveTo` and every result is showing last year's figures. |
| `GuardrailViolation` rate | > 0.1% of calculations | Investigate. A guardrail firing means the engine produced something legally wrong and refused to show it. |
| `DataError` rate | > 1% | Investigate — likely a missing rate table or a bad date. |
| postcodes.io failure rate | > 5% | Confirm the manual fallback works. Consider a static outward-code map. |
| Citation link 404s | Any | Weekly report. Update or archive the link. |
| Content overdue for review | Any past `reviewEvery` | Weekly report to the content owner. |
| Core Web Vitals regression | Outside the §31 budgets | Block the next deploy. |

`RATES_STALE` is the one to wire up first. It is the only signal here that means
every single user is currently being given a wrong number.

---

## How to collect it without breaking R8

The site is static and has no backend, so there is nothing collecting anything
by default. That is the correct starting position, and any addition has to earn
its place.

### Guardrail and data errors

`GuardrailViolation` carries a **rule code and no user data** — that is why the
error class is shaped the way it is. `CalculatorShell` logs the rule code alone,
never the input.

If error reporting is added (Sentry or similar), it must be configured with a
`beforeSend` that strips all form state, and there must be a test proving it.
Ship the test with the integration, not after it.

### Rate staleness

Two independent mechanisms, deliberately:

1. **Build time** — `scripts/check-staleness.ts` fails CI once rates are past
   `effectiveTo`, and warns 60 days out.
2. **Run time** — `RatesStaleBanner` renders from the shipped data at build
   time, so a deploy that sits un-rebuilt across an April boundary shows a
   site-wide banner with no JavaScript required.

The second exists because the first only helps if somebody is deploying.

### Weekly

`.github/workflows/weekly.yml` runs the link-health and review-date checks and
uploads a report. These warn rather than fail: a moved gov.uk link must never
block a deploy that fixes something else.

---

## What not to collect

Set out in the privacy notice, and repeated here because it is a monitoring
decision as much as a privacy one:

- No form field value. Ever. Not the child's age, not an income figure.
- No postcode.
- No council name the user selected.
- No session recording, no heatmaps, no A/B testing on the calculator route.

If analytics is ever added, it is a cookieless, privacy-preserving tool with the
small event set in §30 — `calculator_started`, `maximum_shown` (region as the
only dimension), `means_test_completed` (boolean), `result_printed`,
`letter_generated` (template name), `guidance_page_viewed` — and the privacy
notice is updated **before** it ships, not after.

Spec §42 item 10 leaves open whether analytics ships at all. The default is no.
