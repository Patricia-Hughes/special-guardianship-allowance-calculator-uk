# Open items

From spec §42, updated 30 August 2026 against the research round of 29 August.
Each must close before the feature it blocks ships. Nothing here may be closed
by deriving, estimating or "correcting" a figure.

**Standing rule:** if a figure or legal point is not in the spec or in `/data`,
it does not go in the product. Flag it, open an issue, ship without it.

## Still open

| # | Item | Blocks | Where it is tracked in the code | Owner |
|---|---|---|---|---|
| 1b | Source the 2024/25 rates for **Wales, Scotland and Northern Ireland**. England is done; the archived GOV.UK table covers England only, so backdating leaves those nations' 2024/25 and 2025/26 out. | Backdating outside England | `data/rates.2024-25.json` and `rates.2025-26.json` → those nations are `null` | |
| 2 | Obtain the Welsh Government's own circular for the Welsh NMA. The band inversion is corroborated across two years and the route now ships, but this is still not a primary source. | Nothing, quality only | `data/rates.2026-27.json` → `wales.verify: true` with `anomalyConfirmed` | |
| 4 | Confirm the DfE taper method across more published LA policies. Three found so far. If they diverge, ship configurable with explicit disclosure. Do not invent a national figure. | Means-test accuracy | `meansTest.ts` `DEFAULT_TAPER`; `TAPER_METHOD_ASSUMED` flag | |
| 5 | Re-source Devon and Leeds. Both remain unpublishable for want of a current citable policy URL. | Their LA pages | `data/la-overrides.json` → `publishable: false` | |
| 6 | Legal review of the `UNLAWFUL_CB_DEDUCTION_RISK` and `FIXED_PERCENTAGE_POLICY` flag copy, and of the `/la/` page template. Needs a solicitor, not a researcher. | LA pages, flags | `packages/engine/src/flags.ts` | |
| 9 | Locate the LGSCO decisions themselves (Devon 2024, North Tyneside 17 002 928, Southend 2020, Rochdale 2019) at citable URLs. Naming a council as having acted unlawfully must rest on the decision, not on a secondary report of it. | Lawfulness flags | `data/citations.json`; `la-overrides.json` → `pendingLawfulnessFlag` | |
| 10 | Decide whether analytics ships at all. Default, and the recommendation, is no. | Launch | Not implemented, see the privacy notice | |
| 11 | Segment backdating on the 1–5 April window as well as 1 April, so a council that follows the DfE tax year is not overstated by a few pounds per April. Engineering, not research. | Backdating precision | `backdating.ts` `segmentBoundaries`; `dfeStatedTaxYearFrom` in the rate tables | |

## Closed on 30 August 2026

| # | Item | How it closed |
|---|---|---|
| 1 | 2024/25 rate tables | Recovered from the National Archives snapshot of the GOV.UK fostering-costs page taken 6 September 2024, under the heading "Weekly allowances for the tax year from 6 April 2024 to 5 April 2025". Transcribed as printed, not back-calculated. Cross-checks: applying the announced 3.55% uplift to all 15 cells reproduces the 2025/26 table within a pound, and the £165–£289 range matches the endpoints found independently. `BACKDATING_ENABLED` is on, with a UI on the result page. England only, see item 1b. |
| 3 | DWP Income Support applicable amounts | Sourced for both years from *Benefit and pension rates 2026 to 2027* (updated 16 Feb 2026). `MEANS_TEST_ENABLED` is on. The same document also confirmed the capital rules the spec carried as an assumption, and gave a couple disability premium the engine had been missing. |
| 7 | Kinship Zones status | Confirmed unchanged, seven authorities, stamped `lastVerified: 2026-08-29`. Next check due 29 November 2026. |
| 8 | Region map rebuilt from the DfE regional definition | **Closed as not possible.** No DfE publication lists which authority sits in which NMA band; the GOV.UK table gives three column headings and no definition. The map now rests on ONS Government Office Regions as a documented proxy, recorded in `regionSource` and disclosed on the region picker. |

---

## Wiltshire, corrected, and worth reading

Wiltshire was mapped to `south-east` on the spec's authority. Research of 29
August found **no source for that**, and everything located puts it in the
South West: the ONS Government Office Region, and Community Care of 27 February
2026 labelling the Kinship Zone authorities "Medway (South East), Thurrock
(East of England), and Wiltshire (South West)".

It is now `rest-of-england`. The previous mapping **overstated** Wiltshire
figures by £19 to £31 a week per child, depending on age. That told carers in a
live Kinship Zone they were owed more than they were, which is the worse
direction of error.

The correction rests on inference, not a DfE list, and is recorded as
`sourceConfidence: "inferred-from-GOR"` in `data/la-region-map.json`.

## The authority count is 153, not 152

§9 gate 6 asks for coverage of "all 152 English children's services
authorities". The full upper-tier list (33 London authorities including the
City of London, 36 metropolitan districts, 21 counties and 63 unitaries
including the Isles of Scilly) is 153. The Isles of Scilly is frequently
excluded from local authority statistics, which is the likely source of the
difference. All 153 are mapped so that no carer is unmapped, and
`expectedAuthorityCount` records what actually ships; CI fails if the two drift
apart.

## The April boundary is a genuine mismatch, not a trap to avoid

§11 assumes allowance rates change on 1 April and benefit rates around 6 April,
and treats the five-day gap as the hazard. The real position is different and
better documented: **DfE states the NMA on a tax year** (GOV.UK heads the table
"Weekly allowances for the tax year from 6 April 2026 to 5 April 2027"), while
**councils apply uplifts from 1 April**. North Tyneside's decision record of
21 March 2025 and Rotherham's of 26 March 2024 both say so explicitly.

Both are right in their own frame. `effectiveFrom` follows the council
convention, because that is what decides what a carer is actually paid;
`dfeStatedTaxYearFrom` records the other reading; and a result dated 1–5 April
carries `APRIL_RATE_BOUNDARY` telling the carer the two disagree.

Backdating is now live and segments on **1 April only**, the council
convention, and so the one that matches what a carer was actually paid. It does
not yet split the 1–5 April window separately. For a council that follows the
tax year instead, a backdated total is therefore a few pounds high per April
crossed: five days at the difference between two years' weekly rates, so roughly
£3–£5 per April on current figures. Small, but it is an overstatement, and this
tool exists to survive a council picking a figure apart. Tracked as item 11.

## A bug the means test was hiding

Enabling the means test surfaced a latent unit error: DWP publishes the Income
Support applicable amounts **weekly**, the means test works **monthly**, and
nothing converted between them. Core living costs, the largest line of
allowable expenditure, were being shrunk by a factor of 4.33, which inflated
disposable income, inflated the assessed contribution, and cut the carer's
allowance.

It never fired in production because the function threw on the shipped data
until the DWP figures were sourced. The function is now
`incomeSupportApplicableAmountWeekly`, with the unit in the name, and a test
pins the conversion. Both are recorded here because the shape of this mistake,
a correct-looking number in the wrong unit, is the one most likely to recur.
