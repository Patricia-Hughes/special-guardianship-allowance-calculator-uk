# Architecture decision records

Decisions that a future maintainer would otherwise have to reverse-engineer, or
would reasonably assume were mistakes.

---

## ADR-0001: Unpublishable LA overrides are invisible to the engine

**Status:** accepted · **Relates to:** R9, spec §8.6, §9 gates 8–9, §42 item 5

### Context

`la-overrides.json` holds what councils say they do, and in some cases that an
Ombudsman found against them. R9 requires every statement about a *named*
council to be backed by a stored, dated, live source URL, and CI enforces it.

The seed entries the spec supplies (Devon, Leeds, North Tyneside) ship with
empty `policySourceUrl` and empty `lawfulnessFlag.sourceUrl`. Shipping them as
they are would fail the CI gate. Deleting them would lose research. Filling the
URLs in with plausible-looking links would be fabrication.

### Decision

Each entry carries a `publishable` boolean. `publishableLaOverride()` returns an
entry only when `publishable` is true **and** it has a non-empty
`policySourceUrl` **and**, where a `lawfulnessFlag` is present, that flag has
both a `sourceUrl` and a `decisionDate`.

An entry that fails any of those is invisible to the engine. The calculation
falls back to national minimums and raises `COUNCIL_POLICY_UNKNOWN`, which tells
the carer we do not hold their council's policy and how to ask for it.

CI enforces R9 only against publishable entries, and separately requires every
non-publishable entry to carry a `pendingSourceIssue` link.

### Consequence

R9 is enforced by architecture rather than by review. There is no code path by
which an unsourced claim about a named council reaches a user, even if someone
later adds a component that reads the override map directly — they would have to
bypass the accessor deliberately.

Devon's `flatCoreRateWeeklyPence` is therefore **not** used today. That is
correct: using it would state a specific figure as Devon's policy without being
able to show where it came from.

---

## ADR-0002: Reference data is injectable

**Status:** accepted · **Relates to:** spec §35, §36

### Context

The shipped data deliberately blocks two paths. The means test cannot run
because the DWP Income Support applicable amounts are `PENDING_SOURCE`, and LA
overrides are all unpublishable per ADR-0001.

But §35 requires legal test cases that exercise both — T4, T16, T17, T19 need
the means test; T26 needs a below-NMA LA rate. And §36 says the legal cases are
"not skippable, ever, including for a hotfix".

The obvious workarounds are all bad: loosening the shipped data to make tests
pass, or marking those tests skipped.

### Decision

`calculate(input, deps?)` takes an optional partial `EngineDeps` —
`rateTables`, `benefitTables`, `laOverrides`, `kinshipZones`. Production callers
pass nothing and get the versioned files under `/data`. Tests inject fixtures
from `src/__tests__/fixtures.ts`, which is never imported by `src/`.

### Consequence

The engine is a pure function of (input, data), which it should have been
anyway. No legal test is skipped. The shipped defaults are never loosened to
suit a test.

The fixture file carries a prominent warning that its numbers are invented for
arithmetic and must never reach `/data`.

---

## ADR-0003: The reg 7 floor applies on the maximum-only path

**Status:** accepted · **Relates to:** R4, spec §13.2

### Context

The pseudocode in §13.2 shows the reg 7 floor at step 9, inside the branch that
runs after the means test. Step 5 returns early when no finances were given.

Implemented literally, a former foster carer using the maximum-only calculator —
which is the whole of Phase 1 — is shown the NMA maximum even when their
previous fostering allowance was higher. R4 says such a carer "must never be
shown a figure below their previous fostering allowance within 24 months of the
order".

The R4 guardrail caught this while the tests were being written: the engine
threw a `GuardrailViolation` on a perfectly ordinary Phase 1 input.

### Decision

The floor is applied on both paths, via a shared `applyReg7Floor()`. It is not a
means-test step; it is a rule about what a carer may be **shown**.

Test T7b is the regression test.

### Consequence

A former foster carer on the maximum-only path now sees their protected figure
with `floorApplied: 'reg7-former-foster-carer'` and the reg 7 citation attached.

The guardrail also now resolves months-since-order through the same
`resolve.ts` helper the engine uses, rather than reading
`monthsSinceOrderMade` raw. Previously, an input with an `orderDate` that
disagreed with `monthsSinceOrderMade` could make a correct result throw.

---

## ADR-0004: The multi-step form uses plain React state, not react-hook-form

**Status:** accepted · **Relates to:** spec §6, §20

### Context

§6 specifies "React Hook Form + Zod", with the stated reason that "Zod schemas
double as engine input validation".

The Zod half is done exactly as intended: `packages/engine/src/schema.ts` is the
single source of validation, used by both the form and the engine, so a value
that passes one cannot fail the other.

The form half is a poor fit. This is not a form that submits. It is a six-step
wizard that shows a result after step 2, recalculates as later steps are
answered, and never posts anywhere. Its validation is the engine's, run on the
whole input at calculation time and surfaced as an error summary.

### Decision

Plain controlled state in `CalculatorShell`, with the Zod schema doing the
validation. `react-hook-form` and `@hookform/resolvers` have been removed from
`package.json` rather than left as unused dependencies.

### Consequence

Roughly 11KB gzipped saved on a route that is already over budget (ADR-0005).

The accessibility requirements §24 attaches to forms — labels, `aria-describedby`,
`aria-invalid`, `role="alert"`, an error summary at the top of the step — are
implemented directly and verified by axe on every route. Nothing was traded away
except the library.

Revisit if the form grows: this is a judgement about the form as specified, not
a general position.

---

## ADR-0005: The JS budget in §31 is not reachable with the mandated stack

**Status:** accepted, tracked · **Relates to:** spec §6, §31

### Context

§31 sets first-load JS at **< 120KB gzipped** for the calculator route and
**< 50KB gzipped** for guidance routes, with a CI gate "failing the build on
regression".

§6 mandates Next.js App Router with `output: 'export'`, and TypeScript strict.

Measured, with a modern browserslist so no legacy polyfill is downloaded by any
Tier 1 or Tier 2 browser in §32:

| | gzipped |
|---|---|
| React DOM | 54KB |
| React + Next runtime | 46KB |
| Shared chunk | 13KB |
| **Framework floor, before any application code** | **~113KB** |
| Calculator route, total | 142KB |
| Guidance route, total | 100KB |

The framework alone leaves about 7KB for the entire application on the
calculator route, and exceeds the guidance-route budget twice over with an empty
page. The targets and the stack are not simultaneously satisfiable.

Total page weight is well inside its 400KB budget: 151KB on the calculator
route.

### Decision

Do not silently relax the target, and do not game it by deferring the
calculator behind a dynamic import so it stops counting as "first load" — that
would move the number without helping anybody.

`scripts/check-bundle-budget.ts` therefore:

1. **fails on regression** past a recorded baseline (`apps/web/bundle-baseline.json`),
   which is what §31 says the gate is for;
2. **reports the gap** to the spec targets on every run, so it stays visible;
3. excludes `nomodule` scripts, which no supported browser downloads.

### Consequence

The budget cannot silently erode, and the gap cannot be quietly forgotten.

Closing it properly means changing the stack — a static-first framework with no
client React runtime, or islands — which is a decision for a human. Worth
revisiting if LCP on a real low-end Android device (§32 asks for one) misses the
2.0s target; the static export means most of the page paints without JS at all.

To move the baseline deliberately: `SGO_WRITE_BASELINE=1 pnpm check:bundle`.

### 4 November 2026: approved consent and advertising preparation

The owner approved the SEO/AdSense remediation, including separate certified-CMP
integration and privacy controls. The optimized build now measures 165.6KB on
the calculator and 104.8KB on the two editorial hub routes (gzip), compared with
the recorded 162.6KB / 102.2KB baseline. This includes the Google consent/settings
work added since that baseline and the optional advertising bootstrap. The
advertising runtime is a separate asynchronous chunk: it is not downloaded when
the feature is disabled or when the visitor uses the calculator. The calculator
itself is not deferred to make the measurement smaller.

Accept this explicit baseline update for the approved feature. Keep the existing
2% regression tolerance and total-page-weight gate unchanged. These measurements
apply to the optimized build. The owner's requested readable ZIP disables
minification and is larger; it is tested separately and does not replace this
optimized-build baseline.

---

## ADR-0006: The council picker is a select, not an ARIA combobox

**Status:** accepted · **Relates to:** spec §12, §23, §24

### Context

§23 lists `CouncilPicker` as a "searchable combobox + postcode fallback", and
§24 requires the ARIA combobox pattern with keyboard selection and an announced
result count.

### Decision

A labelled `<select>` containing all 153 authorities, plus the postcode lookup
in a disclosure beside it.

### Consequence

It is fully keyboard operable, announces its option count natively in every
screen reader, needs no JavaScript, and adds nothing to the bundle — which
matters given ADR-0005. Mobile browsers give it a native picker that is easier
to use than any custom widget.

What is lost is type-ahead beyond what the browser does natively. For 153
options, sorted alphabetically, that is a modest loss.

This is flagged as a known limitation on the accessibility statement, inviting
users to say if a searchable version would help them. If that feedback comes,
build the full ARIA pattern.

---

## ADR-0007: Historic and unverified figures are never derived

**Status:** accepted · **Relates to:** R10, spec §8.1, §8.3, §16, §42

### Context

Three gaps exist in the shipped data: 2024/25 rates, the Welsh 0–4 versus 5–15
inversion, and the DWP Income Support applicable amounts. Each could be filled
with a plausible number — back-calculated from an uplift percentage,
"corrected" by swapping the Welsh bands, estimated from published benefit rates.

### Decision

None of them are. Each stays `PENDING_SOURCE` or `verify: true` with a tracking
issue, and the feature depending on it stays behind a flag:

| Gap | Blocks | Flag |
|---|---|---|
| 2024/25 rates | Backdating | `BACKDATING_ENABLED: false` |
| Welsh band inversion | Wales route | `WALES_ROUTE_ENABLED: false` |
| Income Support amounts | Means test | `MEANS_TEST_ENABLED: false` |

Backdating returns blocked years explicitly rather than estimating across them.
The means test throws `DataError` rather than treating a missing applicable
amount as zero. `validate-data` enforces that a `verify: true` nation has its
route flag off.

### Consequence

Phase 1 ships as a maximum-only calculator, which §39 says is already better
than anything currently available.

The reasoning, from §42: an invented number can cost a carer money or lose them
an argument with their council. A figure that looks precise and is a few pounds
out is worse than no figure, because they will take it to a complaint and it
will be dismissed — along with everything else they said.
