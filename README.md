# Special Guardianship Allowance Calculator

A calculator that estimates the weekly Special Guardianship allowance a carer in
the UK could receive, and tells them what the law entitles them to argue for.

The most valuable output is not a number. It is:

> "Your council's maximum for a 12-year-old in the South East is **£255/week**.
> Here is the statutory basis. Here is what they are not allowed to do. Here is
> a letter you can send."

Most carers are underpaid because councils apply blanket policies that have
repeatedly been ruled unlawful. This product's job is to surface the lawful
ceiling, detect the deviation, and hand the user something they can act on.

---

## Getting started

```bash
pnpm install
pnpm build          # engine → letters → static site (apps/web/out)
pnpm verify         # typecheck, unit tests, and every data and content gate
pnpm dev            # local development
```

End-to-end and accessibility tests run against the **static export**, so what
ships is what is tested:

```bash
pnpm build
pnpm test:e2e       # the five journeys from the spec, plus the no-JS path
pnpm test:a11y      # axe-core, zero violations, every route
```

---

## Layout

```
apps/web/          Next.js static export — calculator, guides, legal pages
packages/engine/   @sgo/engine — pure TS. No DOM, no network, integer pence.
packages/letters/  @sgo/letters — template letters, pre-filled
data/              Versioned reference data + JSON Schema. The source of truth.
scripts/           CI gates
docs/              The April runbook, and the decision records
```

---

## The rules that shape the code

Four of these are **runtime assertions in the engine**, not UI copy. If the
engine computes a violating result it throws, and the UI falls back to "we can't
estimate this — here's who to contact".

| | Rule |
|---|---|
| **R1** | Never output a fixed percentage of the fostering rate as "the answer". |
| **R2** | Never deduct Child Benefit by default. It is an explicit opt-in, and raises a critical flag if the carer is on means-tested benefits. |
| **R3** | Every numeric output is labelled "estimate" and carries the citation it derives from. |
| **R4** | A former foster carer must never be shown a figure below their previous fostering allowance within 24 months of the order. |
| **R5** | Scotland must never be routed through the SGO engine. |
| **R6** | The DfE means-test model is labelled non-statutory and pre-Universal-Credit wherever used. |
| **R7** | No output is presented as legal advice. Persistent disclaimer and advice lines on every result. |
| **R8** | No user financial or family data leaves the browser. |
| **R9** | Any statement about a *named* council is backed by a stored, dated, live source URL. |
| **R10** | Rate data is never hardcoded in engine source. It lives in versioned JSON with an effective date. |

R8 and R9 are enforced by architecture rather than by policy: the calculation is
entirely client-side with no backend to receive anything, and an LA override
without a source URL is invisible to the engine (see ADR-0001).

---

## What ships, and what does not

Phase 1 is a **maximum-only** calculator for England, Scotland and Northern
Ireland, with all the guidance and print output. Three features are built but
switched off, each blocked on data we will not invent:

| Feature | Blocked on | Flag |
|---|---|---|
| Means test | DWP Income Support applicable amounts | `MEANS_TEST_ENABLED` |
| Backdating | 2024/25 rate tables | `BACKDATING_ENABLED` |
| Wales route | The 0–4 vs 5–15 band inversion | `WALES_ROUTE_ENABLED` |
| Letter generator | Phase 2 | `LETTER_GENERATOR` |
| Per-council pages | Legal review of the template | `LA_PAGES` |

See `docs/DECISIONS.md` ADR-0007, and `OPEN-ITEMS.md`.

**Do not** fill any of those gaps by deriving a figure — not from an uplift
percentage, not by "correcting" an inverted band, not by estimating from
published benefit rates. An invented number can cost a carer money or lose them
an argument with their council.

---

## CI gates

Every one fails the build.

| Gate | What it catches |
|---|---|
| `pnpm test:unit` | All 28 legal test cases. **Never skippable, including for a hotfix.** |
| `pnpm validate:data` | Schema, monotonic-by-age rates, typo range, uplift sanity, authority coverage, citation existence, R9 sourcing, integer pence |
| `pnpm check:staleness` | Rates past their effective date; the April uprating approaching |
| `pnpm check:content` | Literal money in MDX prose; frontmatter; overdue reviews |
| `pnpm check:headers` | The §29.2 security headers, and that `connect-src` has not grown a host |
| `pnpm check:bundle` | JS regression past the recorded baseline |
| `pnpm test:e2e` | The five journeys, print output, the no-JavaScript path |
| `pnpm test:a11y` | axe-core, zero violations, every route |

Weekly, warn-only: `pnpm check:citations` (link health) and
`pnpm check:review-dates`.

---

## The April update

`docs/RUNBOOK-rate-update.md`. It is the most important recurring operation on
this product and it needs a named owner.

The short version: allowance rates change on **1 April**, benefit rates change
in the **first full week of April**. Two jobs, two pull requests, two dates.
If the uplift is announced late, ship the old rates behind the `RATES_STALE`
banner. Never interpolate.

---

## Licence and scope

Nothing here is legal advice. Financial support for special guardians is
discretionary under regulation 6 — there is no entitlement figure. The
calculator shows the ceiling a council should be starting from and the basis for
it, not an amount anyone can require a council to pay.
