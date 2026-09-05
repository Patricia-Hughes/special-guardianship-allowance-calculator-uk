# Annual update runbook

For whoever maintains this site. Written so you do not have to read the code
every April.

The short version: **rates live in `/data`, not in the pages.** Change a data
file and every figure across the site moves at once. Nothing in the prose needs
touching. The build refuses to publish a rate typed into a page, so there is no
second place to look.

---

## 1. What to monitor, and what each one breaks

Put these in your change-alert tool.

| URL | What changes | What you edit | Pages affected | Calculator |
|---|---|---|---|---|
| `gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering` | **England rates.** Announced Jan to Feb, live 1 April | `data/rates.YYYY-YY.json` → `england.regions` (3 regions × 5 age bands) | **6 pages:** `/rates`, home, and the guides for rates, Kinship Zones, what your council must consider, annual reviews | Every England result. Also the Kinship Zones pilot rate, which *is* this figure |
| `gov.scot/publications/scottish-recommended-allowance-...` | **Scotland rates** | same file → `scotland.rates` | **3 pages:** `/rates`, rates guide, Scotland guide | Every Scotland result |
| `thefosteringnetwork.org.uk/policy-and-campaigns/.../allowances/` | **Wales rates.** Your weakest data, still `verify: true` | same file → `wales.rates` | **1 page:** `/rates` | Every Wales result |
| *(find it)* Northern Ireland allowances **listing page** on `health-ni.gov.uk` | **NI rates** | same file → `northern-ireland.rates` | **2 pages:** `/rates`, rates guide | Every NI result |
| *(find it)* DWP **benefit rates collection** on `gov.uk` | Child Benefit, Guardian's Allowance, benefit cap, Income Support | `data/benefits.YYYY-YY.json` | Benefits guide (Guardian's Allowance amount) | The means test, and the Child Benefit deduction |
| `gov.uk/government/publications/special-guardianship-guidance` | **The rule everything rests on.** No numbers | Nothing automatic. Read it and check the site still describes it correctly | Potentially all 16 guides | The starting-figure logic |
| `gov.wales/written-statement-launch-consultation-revisions-part-6-and-special-guardianship-codes-practice` | The Welsh SGO Code of Practice | Wales pages need **rewriting**, not a rates bump | Wales sections everywhere | Possibly the Wales route entirely |
| `legislation.gov.uk/uksi/2005/1109` | The Special Guardianship Regulations | Prose and citations | Guides citing regs 5, 6, 7, 9, 10, 11, 13, 18 | Regulation 7 two-year floor, regulation 13 Child Benefit |
| `leedscs.trixonline.co.uk/chapter/applications-for-special-guardianship-orders` | Leeds policy, currently "under review" on screen | `data/la-overrides.json` | Result page for Leeds carers | Leeds-specific warnings |
| `derbycsc.trixonline.co.uk/chapter/special-guardianship-orders-and-derby-support-scheme` | Derby policy | `data/la-overrides.json` | Result page for Derby carers | Derby-specific warnings |
| `devoncs.trixonline.co.uk/chapter/applications-for-special-guardianship-orders` | Devon policy | `data/la-overrides.json` | Result page for Devon carers | Devon living-costs multiplier |

### Two you have to find yourself

The Northern Ireland and DWP sources have **the year inside the address**. When
2027/28 is published it appears at a **new URL** and the old one never changes.
A monitor pointed at the PDF will never fire. Point it at the page that *links*
to the PDFs instead.

### Do not monitor

Court judgments, Ombudsman decisions and `web.archive.org` captures. None of them
change after publication. Watching them only trains you to ignore alerts.

---

## 2. The April routine

Roughly February, when England announces.

**Step 1. Copy last year's file.**

```
cp data/rates.2026-27.json data/rates.2027-28.json
```

**Step 2. Edit the new file.**

- `financialYear`: `"2027-28"`
- `effectiveFrom`: `"2027-04-01"` (councils uplift on 1 April)
- `effectiveTo`: `"2028-03-31"`
- `dfeStatedTaxYearFrom` / `To`: 6 April to 5 April (the government states rates
  on the tax year; councils pay on 1 April; the site models both)
- `dataVersion`: bump it
- Each nation's figures, **in pence**. `20500` is £205.00
- Each nation's `sourceId` must point at a citation that exists

**Step 3. Add the citation.** New entry in `data/citations.json` with `label`,
`url`, `kind: "dataset"`, `retrieved`. If the URL has rotted and you cannot find
a replacement, **leave `url` out**. The site then prints the reference and says
it is still sourcing a link. Never paste a dead link.

**Step 4. Register the year in the engine.** This is the only code change, and
the step people miss.

`packages/engine/src/referenceData.ts`:

```ts
import rates202728 from './data/rates.2027-28.json' with { type: 'json' };

export const RATE_TABLES: RateTable[] = [
  rates202728 as unknown as RateTable,   // ← add, NEWEST FIRST
  rates202627 as unknown as RateTable,
  ...
];
```

**Order matters.** `selectRateTable` (`packages/engine/src/dates.ts:63`) walks
the array and takes the first table whose date range contains the date being
calculated. Newest first.

Same pattern for `BENEFIT_TABLES` when the benefits file changes.

**Step 5. Run the checks.**

```
pnpm verify          typecheck, unit tests, data gates, content, headers
pnpm verify:build    build, bundle budget, structured data
cd apps/web && npx playwright test
```

You do **not** need to sync data into the engine by hand. `prebuild`,
`pretypecheck` and `pretest:unit` all run `syncdata` for you.

**Step 6. Rebuild and upload.** `apps/web/out` is the site. Include the hidden
`.htaccess`.

---

## 3. What the gates tell you if you get it wrong

| Gate | Catches |
|---|---|
| `check:staleness` | **Warns at 60 days** before the current rates expire. **Fails the build** once today is past the newest `effectiveTo`. This is your deadline alarm |
| `validate:data` | Rates that fall as age rises, values outside a sane range, implausible year-on-year jumps, a `sourceId` pointing at a citation that does not exist |
| `check:content` | A rate typed into a page instead of read from data. An em dash. A heading answered by a warning box |
| `check:citations` | **HEADs every citation URL.** Run this monthly. It is what would have caught the four dead links |
| `check:schema` | Structured data with a broken reference |

If `validate:data` complains about a figure you are confident is right, it wants
a note explaining why, not an override.

---

## 4. Three things that need a decision, not a copy-paste

**Wales is still unverified.** `wales.verify: true` in the 2026/27 file. The
figures come from The Fostering Network reproducing a Welsh Government letter,
not the letter itself. The letters go out **by email**, which is why they are not
on the open web. `data/watchlist.json` has the two addresses that would get you
the real one. Until then the site says so on screen.

**One year of Welsh rates is missing on purpose.** 2025/26 is `null`. Backdating
for Welsh carers skips that year and names it. Do not fill it by working
backwards from an uplift percentage. The rounding rules are not published and a
wrong historic rate produces a wrong arrears claim.

**Kinship Zones ends in 2029.** `data/kinship-zones.json` carries `runsUntil`
and a three-month review interval. When the pilot is evaluated, the guide and the
warnings need rewriting, not a number change.

---

## 5. What `data/watchlist.json` is for

Documents you are **waiting for**, with a date to check again. Five items now.
`check:staleness` reads it and warns once a check date passes, so a known gap
cannot quietly rot in someone's head.

Your change-alert tool watches what **already exists**. The watchlist tracks what
**does not exist yet**. Both are needed.

---

## 6. The two safety nets, and why they are different

**Your alert tool** watches other people's sites. It tells you *"GOV.UK changed
this page."* That is the early warning.

**`check:staleness`** watches your own data. It tells you *"your figures have
expired"* and fails the build, and a red banner appears on every page for
readers.

The alert can miss a change. The date check cannot miss its own expiry. Keep
both.
