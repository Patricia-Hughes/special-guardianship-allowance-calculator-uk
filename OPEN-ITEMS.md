# Open items

From spec §42, updated 1 September 2026 against the Job A legal review of that
date. Each must close before the feature it blocks ships. Nothing here may
be closed by deriving, estimating or "correcting" a figure.

Short lookups now live in `data/watchlist.json`, where `check:staleness` warns
once each one falls due. A gap left only in a markdown file gets read once and
then never again.

**Standing rule:** if a figure or legal point is not in the spec or in `/data`,
it does not go in the product. Flag it, open an issue, ship without it.

## Still open

| # | Item | Blocks | Where it is tracked in the code | Owner |
|---|---|---|---|---|
| 1b | **Wales 2025/26 only, and accepted as a gap on 3 September 2026** after three exhaustive searches. Northern Ireland and Scotland are now sourced, so backdating covers all four nations for 2024/25 and 2026/27, and three of four for 2025/26. Two routes remain for Wales and neither is a search: a guessable file path, and emailing the two addresses printed on the 2024/25 letter. | One year of Welsh backdating, which the site already names as excluded | `data/watchlist.json` `ciw-nma-bulletins` | Research |
| 3 | ~~The letters are not reachable by a carer.~~ **Built and switched on, 3 September 2026.** The screen lists the letters matching the warnings that fired, fills each with the carer's own council, area and figure, and offers copy and download. It sends nothing and saves nothing. The formal complaint stays behind its gate, and the gate lifts near the Ombudsman's twelve-month limit. Covered by 12 e2e tests. | Nothing | `components/results/LettersPanel.tsx` | |
| 4 | ~~Confirm the DfE taper method.~~ **Answered 2 September 2026: there is no national taper.** Checked against the 2005 Regulations, the 2017 statutory guidance, the DfE means test model and the 2024 kinship guidance. The model fixes the 20% disregard and the 125% living costs and then stops. The absence is a feature of the scheme, so the warning now asks councils where their own taper comes from. | Nothing | `TAPER_METHOD_ASSUMED` | |
| 5 | Wait for Leeds's final revised support offer. | How much we can say about Leeds | `data/la-overrides.json` `leeds.policyUnderReview` | |
| 7 | Legal review of the rewritten copy, if a rewrite happens. The review of 1 September was of the current wording, on the basis that no rewrite is planned. Its findings are about strength of claim rather than style, so they survive a rewrite, but they would need re-checking against the new sentences. | A rewrite, if one happens | `FOR-YOUR-TEAM.md` | |
| 10 | ~~Analytics.~~ **Answered 31 August 2026: no.** Nothing measures visitors, the privacy notice says so, and `check:content` fails the build on any tracker. | Nothing | `scripts/check-content.ts` | |

## Closed on 3 September 2026

| # | Item | How it closed |
|---|---|---|
| 1b (Northern Ireland) | 2025/26 rates | SCALE RATES from the Department of Health model scheme, 155.00 / 173.00 / 194.00 / 228.00 a week from 1 April 2025. The per-4-weeks column multiplies exactly on all four rows. Uplift of 4.0 to 4.2 per cent, consistent with the announced 4 per cent backdated to 1 April. The REDUCED RATES table beneath it, 28 per cent lower, was correctly identified and left alone; a test now pins the scale rate for this year as well as 2024/25. |
| 1b (Scotland) | 2025/26 rates | 171.17 / 199.14 / 272.97 from an archived gov.scot capture of the page updated 27 June 2025. A 1.7 per cent uplift announced in May 2025 and backdated to 1 April. **The conflict is settled**: 5-10 and 11-15 are identical, exactly as the three-band design predicts, and the East Renfrewshire table showing 207.60 was reprinting 2023/24 rates. A test now fails if anyone re-splits the 5-15 band. |
| 3 | The letters screen | Built. See the row above. |
| Sources | Five unlinked citations | The DfE 2025/26 capture, a second independent capture confirming 2024/25, the gov.scot page, the Welsh decision report recording ministerial approval of the 2026/27 allowance, and a GOV.UK statement that there is no minimum allowance after a child is old enough to leave foster care, which the `turning-18` page had no source for at all. |
| The April correction | Reported as outstanding | **Already applied.** Every "1 April" claim in the shipped copy already carries the tax-year counterpart; the April-boundary work closed it on 31 August. The research was against an older exported pack. |

## Closed on 2 September 2026, from the second legal review

The review answered every question put to it, and returned three corrections nobody had asked for.

| Finding | What it was | What changed |
|---|---|---|
| **The duty to assess** | Parked since 1 September because the reviewer said not to guess. Regulation 6 governs when support is *payable*, not when an assessment is *owed*. | It is s.14F(3) of the Children Act 1989 **together with** reg 11(1)(b) of the 2005 Regulations: the Act sets a default of "may" and expressly converts it to "must" for people prescribed in regulations, and reg 11(1) prescribes a special guardian of a child looked after immediately before the order. **"Must" is restored.** The looked-after distinction the page already drew turned out to be exactly the distinction the regulation draws, so only the citation was ever wrong. |
| **Reg 11(2) to (3), which nobody knew about** | The page said a council outside the mandatory class simply need not assess. | It must still give notice with reasons and allow representations if it is minded to refuse. That is the useful half of the answer for a carer whose child was never looked after, and it was missing. |
| **CORRECTION: the annual review citation was wrong** | The site cited regs 10 and 11. Reg 10 imposes a duty on the *carer* to supply an annual statement; reg 11 is the request for assessment. Neither creates a review duty. Reg 17(2) carries "at least annually" but reg 17(1) excludes periodic financial support. | Now **reg 18(2)(a)**, with reg 10 for the statement that triggers it. The trigger is receipt of the statement, not twelve months passing, so the sharper question is now on the page and in the letter: *have you asked me for an annual statement, and if not, why has my support not been reviewed?* |
| **CORRECTION: the three-year rule was missing its exception** | The site said responsibility passes to the new council after three years, full stop. | Reg 5(2) excepts the case where the council is already providing financial support **and the decision to provide it was made before the order**. Then it does not end at three years at all. That is likely to cover exactly the carers most likely to be reading: former foster carers. Added to the page and the warning. |
| **CORRECTION: the reg 7 extension test was too easy** | The site said a council can continue the reward element "where the child's needs justify it". | The test is **exceptional needs of the child or other exceptional circumstances**. A request framed as "the needs have not reduced" fails on its own terms. Corrected in the guidance, the warning and the letter. |
| **Reg 7(1): a threshold question that was absent entirely** | Nothing on the site mentioned it. | Regulation 7 only applies **where the decision to include remuneration was taken before the order was made**. If it was not, reg 7 is not the carer's rule at all and they rest on the guidance and Tower Hamlets instead. It is now the first question the letter asks. |
| Reg 13 attribution refined | The site said the regulations permit the Child Benefit deduction. | Reg 13(2) does not name Child Benefit: it imposes a **duty to take account of other benefits**. The deduction itself comes from *Barrett v Kirklees*. Attributing it to reg 13's text invites a council lawyer to correct the carer, so the two are now cited separately. The site's position is unchanged. |
| The taper | Open. | **No national taper exists.** Confirmed against four sources. Left as an assumption with a visible warning, which now also asks councils where their taper comes from. |
| Four case citations | No permanent URLs. | All four found, all four still good law, none overruled or distinguished. BAILII and the National Archives Find Case Law. |
| The complaint gate | Was it too cautious? | Keep it, with one narrow exception: a carer near the Ombudsman's twelve-month limit should be let through, because that is the one case where slowing someone down does real harm. Recorded for whoever builds the letters screen. |
| Five sources located | Unlinked. | The two Up-rating Orders, the two-child limit Act, the SRA implementation review and the NI 2026/27 allowances. Four remain open. |
| The Welsh inversion | Served with an explanation. | Confirmed a third time, and the reviewer flagged a risk nobody had: if the monotonic gate ever loses its exemption the build breaks and whoever is on shift will "fix" the data. The gate's failure message now says not to, and a test pins the inversion so it fails loudly rather than quietly. |

## Closed on 1 September 2026, from the Job A legal review

Nineteen numbered actions. Eighteen applied, one parked as item 6 above.

| Finding | What it was | What changed |
|---|---|---|
| 1 and 2 | **The formal complaint fired on the wrong trigger.** It was promoted whenever an Ombudsman finding about a *different* carer appeared, which the site's own warning correctly says does not apply to this one. A carer would complain holding no policy and no breakdown, with the formal clocks started. It also asserted "I have raised this before and have not had a full answer", which the site cannot know. | No flag promotes it. It records that the policy and the breakdown must be asked for first. The assertion is a deletable placeholder. |
| 3 | **One letter doing two jobs badly.** A carer whose whole allowance was being stepped down was handed the extension letter, which never asks the tapering question and whose second question concedes the drop. That is the Southend point, and it was the strongest argument the carer had. | Split in two: one asks which element is being reduced, one asks for the reward element to continue. |
| 4 | **Regulation 13 permits the Child Benefit deduction and the site never said so.** A carer was pointed at a question they cannot win. | The warning, the letter and the page now lead with what is permitted and move to how the council decided this case. The 12 month Ombudsman limit is stated. |
| 5 | **Regulation 7 is a power, not a protection**, in nine places. It lets a council keep paying the reward element and lets it stop. | Reworded throughout. There were eleven places, not nine: the result page headline and the next-steps card also said it, and neither appears in the packs the reviewer was given, so an end to end test caught them rather than the review. The continuity argument is now made from the guidance and Tower Hamlets, which is where it comes from, and the two year point is said to cut both ways. |
| 6 | **"Ruled unlawful" and "not allowed" overstated the sources.** No court has held fixed percentages unlawful as a class, and the Ombudsman says fault. | Heading and H1 softened, the Merton counterweight added, "unjustified departure" kept and glossed, the observation dated. |
| 7 | The must assess citation. | Parked as item 6 above, per the reviewer's instruction not to guess. |
| 8 | A letter asked about "that figure" when the sentence introducing the figure was conditional and absent. | Fixed, and a test now walks every letter in its sparse form looking for the same shape. |
| 9 | A1.4 looked like it carried hardcoded Devon text. | It did not: the export filled every optional field with realistic values. The export now uses obvious placeholders. |
| 10 to 13 | Starting rate versus final award; fire only on upheld decisions; show the date and link; the Welsh circular. | All applied. |
| 14 to 19 | The two April calendars; sourcing the unsourced warnings; attributing the fostering figure; which council to send to; the data corrections; the glossary terms. | All applied. |

**Two things the review surfaced that were not on its list.** Twelve of the 34 warnings carried no
source at all, because the citation gate covered the guidance pages and the data and stopped there.
Eight are now sourced, four are named as legitimately operational, and gate 18 fails the build on
any new one. And the letters are not reachable by a carer at all yet: the generator is not switched
on, so the reviewer was reading copy that no carer has ever received.

> **A note on wording in earlier versions of this file.** Rows here used to refer
> to "LA pages" and to a `/la/` page template. There is no such route and there
> never was one built: the council picker inside the calculator covers all 153
> English authorities, and for the six councils whose published policy we hold,
> that detail appears on the carer's own result rather than on a page of its
> own. Nobody should be briefed to review a page that does not exist.

## Closed on 1 September 2026

| # | Item | How it closed |
|---|---|---|
| 1b (Northern Ireland) | 2024/25 Northern Irish rates | The Department of Health model scheme PDF was opened by hand, since its server refuses automated requests. Section 1, SCALE RATES, from 1 April 2024: 149, 166, 187 and 219 pounds a week. The document prints a per-4-weeks column beside them and all four rows multiply exactly, which is the document checking itself, so the pound of doubt raised by the uplift arithmetic on 31 August is resolved: the secondary sources were right and the rounding chain simply does not reproduce. Northern Irish backdating now works for 2024/25. **The same PDF prints a REDUCED RATES table (108, 120, 135, 158) for enhanced allowances and short breaks only. It is about 28 per cent lower and is not the allowance. A test pins the scale rate so the wrong table cannot be picked up later.** |

## Closed on 31 August 2026

| # | Item | How it closed |
|---|---|---|
| 1b (Scotland) | 2024/25 Scottish rates | The Scottish Recommended Allowance was not uprated for 2024/25, so the rates announced on 29 August 2023 stood for the whole year: 168.31, 195.81 and 268.41 pounds a week. gov.scot gives 11-15 the same as 5-10, which is the three-band shape the SRA is built on; some local authority reproductions show a higher 11-15 figure and the primary source wins. Scottish backdating now works for 2024/25. |
| 9 | The four Ombudsman decisions | All four found at permanent lgo.org.uk addresses and now cited properly. Three corrections came with them: North Tyneside 17 002 928 is a February **2018** report, not 2019; Southend is 19 003 363, decided 5 October 2020; and the Rochdale decision survived judicial review in December 2019, permission refused and costs awarded, which is what makes it safe to rely on. The Rochdale entry had also been carrying a link to a Shropshire policy PDF, which was simply wrong. Three further decisions were added to the record. |
| 11 | The 1 to 5 April window | Backdating now cuts a segment at 6 April as well as 1 April. The figure still follows the council convention, because that is what decides what a carer was actually paid, and the result states in pounds how much of the total would not apply if their council follows the DfE tax year instead. On a two-year claim that is about 10 pounds, and it is now said rather than assumed. |
| 10 | Analytics | Answered: no. See the row above. |

## Closed on 30 August 2026

| # | Item | How it closed |
|---|---|---|
| 1 | 2024/25 rate tables (England) | Recovered from the National Archives snapshot of the GOV.UK fostering-costs page taken 6 September 2024, under the heading "Weekly allowances for the tax year from 6 April 2024 to 5 April 2025". Transcribed as printed, not back-calculated. Cross-checks: applying the announced 3.55% uplift to all 15 cells reproduces the 2025/26 table within a pound, and the 165 to 289 pound range matches the endpoints found independently. `BACKDATING_ENABLED` is on, with a UI on the result page. |
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

## Two bugs this round found, both in the same place

**The site was accusing councils on the strength of a word.** The critical
`FIXED_PERCENTAGE_POLICY` flag, which tells a carer their council may be running
a policy the courts struck down, was raised by pattern-matching the prose in
`corePolicy` for a percentage. North Tyneside's entry reads "Percentage model
abolished 2018", so every North Tyneside carer was being told their council
"appears to set the allowance at a fixed share of the fostering rate", about a
practice it scrapped after the Ombudsman's report. Devon, which pays the full
rate, would have been accused the moment it was published. The flag now reads
one recorded field, `fixedPercentageOfFosteringRate`, where `null` means somebody
looked and the answer was no. Gate 15 in `validate-data` fails the build if the
prose mentions a proportion and the field is missing, and a test walks four
forms of wording that must never raise it.

**A finding has a date, and the site was reading it as the present tense.** The
Ombudsman found Devon at fault in January 2024 over a blanket Child Benefit
deduction. Devon changed the policy from 1 January 2024, and a later complaint
about its current practice was **not upheld**. A flag saying only the first half
is not far from a false statement. Findings can now record
`concernsFormerPolicy`, `policyChangedOn` and `supersededBy`, and where they do
the result shows `LGSCO_FINDING_FORMER_POLICY` instead: same facts, correct
tense, and "important" rather than "check these first", because a council that
fixed the problem is not a council with the problem. Gate 17 insists that saying
a council was cleared carries the same evidence as saying it was at fault.

Both are the same mistake in different clothes: inferring a serious claim about
a named organisation instead of recording it. Neither was caught by a test,
because every test asked whether the flag fired, and none asked whether it
should have.

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
