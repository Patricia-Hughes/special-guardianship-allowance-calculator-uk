# Annual update runbook

For whoever maintains this site. Written so nobody has to read the code again
every April.

**The one thing to know:** rates live in `/data`, never in the pages. Change a
data file and every figure across the site moves at once. The build refuses to
accept a rate typed into prose, so there is no second place to look.

---

## Quick version

Every February, when England announces:

1. Copy last year's rates file, edit the numbers
2. Add the new source to `data/citations.json`
3. **Register the year in `referenceData.ts`** ← the step people miss
4. `pnpm verify && pnpm verify:build`
5. Rebuild, upload `apps/web/out`

Full detail in section 5. Every command is in section 1.

---

## 1. Every command, and when to run it

### The two you actually have to remember

```
pnpm verify          before you commit
pnpm verify:build    before you upload
```

`verify` checks the words and the numbers. `verify:build` builds the site and
then checks the build. If both pass, the site is shippable.

### Getting started

```
pnpm install         first checkout, and after any lockfile change
pnpm dev             preview on http://localhost:3000, reloads as you edit
```

Node 20 or newer, pnpm 10. The version is pinned in `package.json` under
`packageManager`, so `corepack enable` will pick it up for you.

### Everything, in one table

| Command | What it does | When to run it |
|---|---|---|
| `pnpm install` | Installs dependencies | First checkout, lockfile changes |
| `pnpm dev` | Local preview, live reload | While editing |
| `pnpm verify` | typecheck, unit tests, data gates, content, headers | Before every commit |
| `pnpm verify:build` | Builds, then bundle budget and structured data | Before every upload |
| `pnpm build` | Static export into `apps/web/out` and nothing else | Rarely on its own |
| `pnpm typecheck` | TypeScript, no emit | Inside `verify` |
| `pnpm lint` | ESLint | By hand. Not inside `verify` |
| `pnpm test:unit` | The engine and letter unit tests | Inside `verify` |
| `pnpm test:e2e` | Playwright, desktop and mobile | Before a release |
| `pnpm test:a11y` | The accessibility subset of the above | Before a release |
| `pnpm validate:data` | Rate sanity: falling rates, mad values, missing sources | Inside `verify` |
| `pnpm check:staleness` | Rate expiry, council review dates, watchlist dates | Inside `verify` |
| `pnpm check:content` | A rate typed into prose, an em dash, an unanswered heading | Inside `verify` |
| `pnpm check:headers` | The security headers are still in `.htaccess` | Inside `verify` |
| `pnpm check:schema` | Every structured-data reference resolves | Inside `verify:build` |
| `pnpm check:bundle` | JavaScript size has not crept up | Inside `verify:build` |
| **`pnpm check:citations`** | **HEADs every source URL on the site and reports dead ones** | **Monthly, by hand. Nothing runs it for you** |

### The one command nothing runs for you

```
pnpm check:citations
```

Run it **once a month**. It opens all 53 source links on the site and tells you
which ones have died. It needs internet, it takes a minute, and it **warns
rather than fails**, on purpose: a government page moving must not block a
deploy that fixes something else.

This is the check that caught the four dead links already removed from
`citations.json`. Nothing else on this list can catch link rot, because rot
happens on somebody else's server.

When it reports a 404, see section 7.

### Faking the date

```
SGO_TODAY=2027-04-12 pnpm check:staleness
```

`SGO_TODAY` overrides today's date for `check:staleness` and `check:content`
only. It changes nothing on the built site. Use it to rehearse next April
before it arrives, or to confirm a fix works.

### Setting the domain

The domain is baked into the schema, the sitemap, `robots.txt` and every
canonical tag from one place, `apps/web/lib/jsonLd.tsx`:

```
NEXT_PUBLIC_SITE_URL=https://specialguardianshipallowance.uk pnpm verify:build
```

It already defaults to that address, so you only need the variable if the
domain ever changes. Set it once, in the environment, not in twenty files.

### Export scripts, for handing work to somebody else

None of these change the site. They read it and write a document.

| Command | Produces |
|---|---|
| `pnpm export:writer` | Every visible word, taken from the built site |
| `pnpm export:content` | The copy plus the source behind each claim, risk-marked |
| `pnpm export:content-bundle` | Everything, calculator labels included |
| `pnpm export:facts` | Every number, rule and assumption the calculator runs on |
| `pnpm export:review` | The warnings and the letters, in full sentences |
| `pnpm export:brief` | The site and the research in one file |

`export:facts` is the useful one for a developer. It is generated from `/data`
and the engine source, so it cannot drift from what ships.

---

## 2. How the site warns you

You do not have to remember the deadline. Two things nag you.

### On your screen, when you run `pnpm check:staleness`

**60 days before rates expire**, it prints:

```
⚠ The April uprating is approaching: 2026-27 rates end 2027-03-31
  in 60 days. Open the tracking issue and start the runbook in ANNUAL-UPDATE.md.
```

**After they expire**, it stops warning and starts **failing**:

```
✗ Rates are STALE in production: the newest table (2026-27) ended
  2027-03-31, 12 days ago. Ship the new financial year, or the RATES_STALE
  banner if the uplift has not been announced. Never interpolate.
```

A failure means `pnpm verify` exits non-zero. You cannot ship without noticing.

**Current deadline: 31 March 2027.** Warnings start 30 January 2027.

It also warns you when:

- A council in `la-overrides.json` was verified over a year ago
- Kinship Zones was verified over 90 days ago
- A `watchlist.json` item has passed its check date

### On the site, for readers

If the rates expire and nobody rebuilds, a **red banner** appears at the top of
every page. It checks the reader's own clock, so it works even on a site nobody
has rebuilt for a year.

**The next one appears on 1 April 2027.** Section 3 explains how to clear it.

---

## 3. The red banner, and how to clear it

### What the reader sees

Not a crash and not an error page. A red bar above the content on every page:

> **These rates may be out of date.** My newest figures ran to 2027-03-31. New
> rates take effect on 1 April each year. Please check the current national
> minimum allowance before using anything here in a letter.

The calculator still works. Every page still loads. Nothing is broken.

### Why it appears, and why it goes

`apps/web/components/ui/StaleWatch.tsx` compares today's date against the last
day of the newest rates file. Today that is `2027-03-31`.

| Condition | Banner |
|---|---|
| Today is after `effectiveTo` | Shows |
| Today is on or before `effectiveTo` | Hidden |

Add the 2027-28 file and `effectiveTo` becomes `2028-03-31`. Today is no longer
after it, so the banner is gone. You change nothing else. There is no flag to
set and no line to delete.

### How to clear it

Publish the new financial year. That is the whole fix, and it is the April
routine in section 5:

1. `cp data/rates.2026-27.json data/rates.2027-28.json`
2. Enter the new figures, and set `effectiveTo` to `"2028-03-31"`
3. Add the new source to `data/citations.json`
4. Register the year in `packages/engine/src/referenceData.ts`, newest first
5. `pnpm verify && pnpm verify:build`, then upload `apps/web/out`

### There is no dismiss button, on purpose

Do not add one, and do not comment out the banner to make a deadline. The banner
is only ever on screen because the figures really have expired. Hiding it leaves
a carer quoting a dead rate to their council in a letter, which is the one
outcome this site exists to prevent.

### Proof that publishing the year is enough

Run with a faked date, before the new year is registered:

```
$ SGO_TODAY=2027-04-12 pnpm check:staleness
✗ Rates are STALE in production: the newest table (2026-27) ended
  2027-03-31, 12 days ago.
```

Same date, after registering a 2027-28 table:

```
$ SGO_TODAY=2027-04-12 pnpm check:staleness
check-staleness: passed with 6 warning(s) (as at 2027-04-12).
```

`SGO_TODAY` is a date override read by `check-staleness` and `check-content`. It
changes nothing on the built site, so you can rehearse next April's failure today
without touching the data. Use it to test your work before 1 April arrives.

### If 1 April arrives and the figures are not published yet

Leave the banner up. It is telling the truth. Do not work out next year's rates
from an uplift percentage to silence it: a guessed rate produces a wrong arrears
claim. Publish when the real numbers land, and it clears the same day.

### Where the code lives, if you ever need it

| File | Does |
|---|---|
| `apps/web/components/ui/StaleWatch.tsx` | The banner. Re-checks the reader's clock hourly |
| `apps/web/components/ui/RatesStaleBanner.tsx` | Reads the newest `effectiveTo` and decides at build time |
| `apps/web/app/layout.tsx` | Places it above every page |
| `scripts/check-staleness.ts` | The build-time version of the same check |

---

## 4. What to monitor

Put these in your change-alert tool.

| URL | What changes | What you edit | Pages affected | Calculator |
|---|---|---|---|---|
| `https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering` | **England rates.** Announced Jan to Feb, live 1 April | `data/rates.YYYY-YY.json` → `england.regions` | **6 pages:** `/rates`, home, and the guides for rates, Kinship Zones, what your council must consider, annual reviews | Every England result. Also the Kinship Zones pilot rate, which *is* this figure |
| `https://www.gov.scot/publications/scottish-recommended-allowance-for-foster-and-kinship-carers-information-for-carers-and-professionals/` | **Scotland rates** | same file → `scotland.rates` | **3 pages:** `/rates`, rates guide, Scotland guide | Every Scotland result |
| `https://www.thefosteringnetwork.org.uk/policy-and-campaigns/empowering-children-and-young-people/allowances/` | **Wales rates.** Your weakest data, still `verify: true` | same file → `wales.rates` | **1 page:** `/rates` | Every Wales result |
| `https://www.gov.uk/government/publications/special-guardianship-guidance` | **The rule everything rests on.** No numbers | Nothing automatic. Read it, check the site still describes it right | Potentially all 16 guides | The starting-figure logic |
| `https://www.gov.wales/written-statement-launch-consultation-revisions-part-6-and-special-guardianship-codes-practice` | The Welsh SGO Code of Practice | Wales pages need **rewriting**, not a rates bump | Wales sections everywhere | Possibly the whole Wales route |
| `https://www.legislation.gov.uk/uksi/2005/1109` | The Special Guardianship Regulations | Prose and citations | Guides citing regs 5, 6, 7, 9, 10, 11, 13, 18 | Reg 7 two-year floor, reg 13 Child Benefit |
| `https://leedscs.trixonline.co.uk/chapter/applications-for-special-guardianship-orders` | Leeds policy, currently "under review" on screen | `data/la-overrides.json` | Result page for Leeds carers | Leeds warnings |
| `https://derbycsc.trixonline.co.uk/chapter/special-guardianship-orders-and-derby-support-scheme` | Derby policy | `data/la-overrides.json` | Result page for Derby carers | Derby warnings |
| `https://devoncs.trixonline.co.uk/chapter/applications-for-special-guardianship-orders` | Devon policy | `data/la-overrides.json` | Result page for Devon carers | Devon living-costs multiplier |

### Not worth monitoring

Court judgments, Ombudsman decisions, and the `web.archive.org` captures. None of
them change after publication. Watching them only trains you to ignore alerts.

---

## 5. The April routine

### Step 1. Copy last year's rates file

```
cp data/rates.2026-27.json data/rates.2027-28.json
```

### Step 2. Get the new figures

Open each source and read the table. **All four are in section 6 below with the
URL pattern for finding next year's.**

- England: `https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering`
- Scotland: `https://www.gov.scot/publications/scottish-recommended-allowance-for-foster-and-kinship-carers-information-for-carers-and-professionals/`
- Wales: `https://www.thefosteringnetwork.org.uk/policy-and-campaigns/empowering-children-and-young-people/allowances/`
- Northern Ireland: see section 6, the URL changes every year

### Step 3. Edit the new file

- `financialYear`: `"2027-28"`
- `effectiveFrom`: `"2027-04-01"`. Councils uplift on 1 April
- `effectiveTo`: `"2028-03-31"`
- `dfeStatedTaxYearFrom` / `To`: 6 April to 5 April. The government states rates
  on the tax year, councils pay from 1 April, and the site models both
- `dataVersion`: bump it
- The figures, **in pence**. `20500` is £205.00
- Each nation's `sourceId` must name a citation that exists

### Step 4. Add the citation

New entry in `data/citations.json`:

```json
"dfe-nma-2027-28": {
  "label": "DfE National Minimum Allowance for foster carers, 2027 to 2028",
  "url": "https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering",
  "kind": "dataset",
  "retrieved": "2027-02-14"
}
```

If a URL has rotted and you cannot find a replacement, **leave `url` out
entirely**. The site prints the reference and says it is still sourcing a link.
Never paste a dead link.

### Step 5. Register the year in the engine

**This is the only code change, and the step people miss.** Dropping a file into
`/data` does nothing on its own.

`packages/engine/src/referenceData.ts`:

```ts
import rates202728 from './data/rates.2027-28.json' with { type: 'json' };

export const RATE_TABLES: RateTable[] = [
  rates202728 as unknown as RateTable,   // ← add here, NEWEST FIRST
  rates202627 as unknown as RateTable,
  rates202526 as unknown as RateTable,
  rates202425 as unknown as RateTable,
];
```

**Order matters.** `selectRateTable` in `packages/engine/src/dates.ts:63` walks
the array and takes the first table whose date range contains the date being
calculated. Newest first, always.

Same pattern for `BENEFIT_TABLES` when the benefits file changes.

### Step 6. Run the checks

```
pnpm verify          typecheck, unit tests, data gates, content, headers
pnpm verify:build    build, bundle budget, structured data
cd apps/web && npx playwright test
```

You do **not** need to sync data into the engine by hand. `prebuild`,
`pretypecheck` and `pretest:unit` all run `syncdata` for you.

### Step 7. Upload

`apps/web/out` is the site. Include the hidden `.htaccess`.

---

## 6. Finding next year's URL

Two sources put **the year inside the address**. Your alert tool will never fire
on them, because the old file stays exactly as it was and the new one appears
somewhere else.

### Northern Ireland

Every year I hold:

```
2024-25  https://www.health-ni.gov.uk/sites/default/files/publications/health/model-scheme-2024-25.pdf
2025-26  https://www.health-ni.gov.uk/sites/default/files/2026-05/Foster%20care%20allowances%202025-26.pdf
2026-27  https://www.health-ni.gov.uk/sites/default/files/2026-05/Foster%20care%20allowances%202026-27.pdf
```

**The pattern:** the filename is predictable, `Foster care allowances YYYY-YY.pdf`.
The folder is not: it is the month the file was uploaded, and 2025-26 and 2026-27
were both uploaded in `2026-05`.

**So:** search `health-ni.gov.uk` for "Foster care allowances", or monitor the
Department of Health publications listing that links to them. Do not monitor the
PDF itself.

### DWP benefit rates

```
2026-27  https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027
```

**The pattern is predictable:**

```
https://www.gov.uk/government/publications/benefit-and-pension-rates-YYYY-to-YYYY/proposed-benefit-and-pension-rates-YYYY-to-YYYY
```

So 2027/28 should be at `benefit-and-pension-rates-2027-to-2028/...`. Note the
word **proposed**: once the rates are confirmed the page sometimes drops it. Try
both.

### Wales, if you ever get the real letter

The Fostering Network media URLs use a random ID (`rzzgloqq`) that cannot be
guessed. But the 2024/25 letter also exists at a **predictable** path:

```
https://www.thefosteringnetwork.org.uk/sites/default/files/2024-05/NMA%20Letter%202024-25%20-%20English%20(E)_0.pdf
```

**The pattern:** `/sites/default/files/YYYY-MM/NMA%20Letter%20YYYY-YY%20-%20English%20(E)_0.pdf`

Try `2025-04/`, `2025-05/`, `2025-06/` with the year changed. `watchlist.json`
records this, along with the two email addresses that would get you the letter
directly, which is more likely to work.

---

## 7. Jobs that are not the April uprating

### A source link has died

`check:citations` reports a 404. Do this, in order:

1. **Look for the same document at a new address.** Government pages move, they
   rarely vanish. Search the department's own site for the title.
2. **Found it** → update `url` in `data/citations.json` and set `retrieved` to
   today.
3. **Cannot find it** → **delete the `url` line entirely and keep the entry.**
   Add a `note` recording the dead address and the date you checked.

Deleting the URL is not the same as deleting the source. The site prints the
reference and says it is still sourcing a public link. The claim keeps its
attribution and the reader can see what it rests on.

**Never paste a link you have not opened, and never swap in a different
document that looks similar.** Every factual claim on this site names its
source, and a wrong source is worse than an honest gap.

### Adding a new source

One entry in `data/citations.json`, keyed by a slug you invent:

```json
"dfe-nma-2027-28": {
  "label": "DfE National Minimum Allowance for foster carers, 2027 to 2028",
  "url": "https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering",
  "kind": "dataset",
  "retrieved": "2027-02-14"
}
```

`kind` is one of `statute`, `regulation`, `guidance`, `dataset`, `case` or
`ombudsman`. `retrieved` is the day **you** opened it, not the day it was
published.

Then reference the slug from wherever the claim lives. `validate:data` fails the
build if a `sourceId` names a citation that does not exist, so a typo cannot ship.

### Adding or updating a council

`data/la-overrides.json`, in the `authorities` array. The rule that matters is
at the top of the file:

> An entry may only be used in a user-facing calculation or page when
> `publishable === true`, which requires a non-empty, dated `policySourceUrl`
> (and, where a `lawfulnessFlag` is present, a non-empty `sourceUrl` and
> `decisionDate`). CI enforces this.

So a council you have heard something about, but cannot link to, stays
`publishable: false`. It sits in the file as a record and shows nobody anything.

Two fields carry different meanings and are easy to confuse:

- `corePolicy` is what the council **says** it does
- `lawfulnessFlag` is whether that **survived scrutiny**, with the Ombudsman
  decision that says so

Set `verifiedOn` to the day you read the policy. `check:staleness` warns once
that is over a year old.

### Adding something you are waiting for

`data/watchlist.json`, in the `items` array. Use it for a document that does not
exist yet, or one you cannot find. Six fields: `id`, `what`, `why`, `url`,
`checkAfter` and `openItem`.

Set `checkAfter` and `check:staleness` nags you once that date passes, so a
known gap cannot quietly rot in somebody's head. Five items in there now.

### Correcting one figure mid-year

Edit the figure in the relevant `data/rates.YYYY-YY.json` and bump `dataVersion`.
Do not create a new file: a new file means a new period, and this is a
correction to an existing one.

If `validate:data` complains about a figure you are sure is right, it wants a
note explaining why, not an override.

### Things never to do

| Do not | Because |
|---|---|
| Type a rate into a page | The build refuses it. Rates live in `/data` only |
| Add a dismiss button to the stale banner | It is only ever showing because the figures expired |
| Work out a missing rate from an uplift percentage | The rounding rules are not published. A wrong historic rate produces a wrong arrears claim |
| Copy `packages/engine/src/data/` by hand | It is generated and gitignored. `prebuild`, `pretypecheck` and `pretest:unit` all run `syncdata` |
| Add analytics | A build gate blocks it. This audience did not consent to being measured |
| Use an em dash | A build gate blocks it. House style |

---

## 8. What the gates catch

| Gate | Catches |
|---|---|
| `check:staleness` | Warns 60 days before rates expire. **Fails** once they have. Your deadline alarm |
| `validate:data` | Rates that fall as age rises, values outside a sane range, implausible year-on-year jumps, a `sourceId` naming a citation that does not exist |
| `check:content` | A rate typed into a page instead of read from data. An em dash. A heading answered by a warning box |
| `check:citations` | **HEADs every citation URL.** Run monthly. This is what catches dead links |
| `check:schema` | Structured data with a broken reference |

If `validate:data` complains about a figure you are sure is right, it wants a
note explaining why, not an override.

---

## 9. Three things that need a decision, not a copy-paste

**Wales is still unverified.** `wales.verify: true` in the 2026/27 file. The
figures come from The Fostering Network reproducing a Welsh Government letter,
not the letter itself. The letters go out **by email**, which is why they are not
on the open web. Until you have the letter, the site says so on screen.

**One year of Welsh rates is missing on purpose.** 2025/26 is `null`. Welsh
backdating skips that year and names it. Do not fill it by working backwards from
an uplift percentage: the rounding rules are not published, and a wrong historic
rate produces a wrong arrears claim.

**Kinship Zones ends in 2029.** `data/kinship-zones.json` carries `runsUntil` and
a three-month review interval. When the pilot is evaluated, the guide and the
warnings need rewriting, not a number change.

---

## 10. `watchlist.json`, and how it differs from your alert tool

`watchlist.json` is a list of documents you are **waiting for**, each with a date
to check again. Five items now. `check:staleness` reads it and warns once a date
passes, so a known gap cannot quietly rot in someone's head.

Your alert tool watches what **already exists**. The watchlist tracks what **does
not exist yet**. You need both.

---

## 11. Why there are two safety nets

**Your alert tool** watches other people's sites. It says *"GOV.UK changed this
page."* That is the early warning.

**`check:staleness`** watches your own data. It says *"your figures have
expired"*, fails the build, and puts a red banner in front of readers.

An alert can miss a change. A date check cannot miss its own expiry. Keep both.
