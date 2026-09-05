# Every figure and rule behind the calculator

For final research review. Generated 2026-09-05 from `/data` and
the engine source, so nothing here can drift from what the site actually does.

## What to check, and what not to

**Check:** that every figure below matches its source document as printed, that
every source is reachable, and that nothing described as a rule is actually an
assumption in disguise.

**Do not "correct" anything that looks odd.** Two things on this site look like
errors and are not, and both are documented below: the Welsh age bands, and the
Scottish 5 to 15 band. Both were checked twice.

**The standing rule:** if a figure or a legal point is not in a published source
we hold, it does not go in the product. Where something is missing the site says
so rather than estimating. Those admissions are listed at the end, and they are
deliberate.


---

## 1. What is switched on

A feature behind a flag that is off does not run at all, whatever the data says.


| Feature | State |
|---|---|
| `MEANS_TEST_ENABLED` | **on** |
| `BACKDATING_ENABLED` | **on** |
| `WALES_ROUTE_ENABLED` | **on** |
| `LETTER_GENERATOR` | **on** |
| `POSTCODE_LOOKUP` | **on** |
| `KINSHIP_ZONE_PATH` | **on** |
| `WELSH_LANGUAGE` | off |
| `LA_PAGES` | off |


---

## 2. The allowance rates

These are fostering national minimum allowances. The statutory guidance says the
core fostering allowance is the starting point for a special guardianship
allowance, which is why they are the basis of every figure the site shows.

All amounts are per week.


### Financial year 2024-25

Effective 2024-04-01 to 2025-03-31.

Two dates, deliberately: councils apply from **2024-04-01**, the DfE states the same rates for a tax year beginning **2024-04-06**. The site pays out on the council convention and says in pounds what the other reading would give.

> All four nations. England is transcribed from the National Archives snapshot of 6 September 2024 of the GOV.UK page, under the heading 'Weekly allowances for the tax year from 6 April 2024 to 5 April 2025', as published at the time and NOT back-calculated from the 6.88% uplift. That page states 'This guidance applies to England'. Scotland was added on 31 August 2026: the Scottish Recommended Allowance was not uprated for 2024/25, so the rates introduced on 29 August 2023 stood for the whole year. Northern Ireland was added on 1 September 2026 from the Department of Health model scheme PDF. Wales was added on 1 September 2026 from the Welsh Government circular of 26 February 2024, which the reviewer supplied. All four nations now have 2024/25. Cross-check for England: applying the announced 3.55% uplift to every one of these 15 cells reproduces the 2025/26 table within a pound, and the range 165 to 289 pounds matches the endpoints reported independently in secondary sources.

#### england

Source: [DfE National Minimum Allowance for foster carers, 2024 to 2025 (National Archives snapshot)](https://web.archive.org/web/20250302000000/https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering), read 2026-08-30

Uplift on the previous year: 6.88%

| Age band | london | south-east | rest-of-england |
|---|---|---|---|
| 0-2 | £191.00 | £183.00 | £165.00 |
| 3-4 | £195.00 | £189.00 | £170.00 |
| 5-10 | £217.00 | £208.00 | £187.00 |
| 11-15 | £248.00 | £238.00 | £213.00 |
| 16-17 | £289.00 | £278.00 | £249.00 |

#### wales

Source: [Welsh Government, National Minimum Allowances for foster carers 2024 to 2025, circular of 26 February 2024](https://www.thefosteringnetwork.org.uk/media/rzzgloqq/nma-letter-2024-25-english-e-_0.pdf), read 2026-09-03

Uplift on the previous year: 3%

| Age band | Weekly |
|---|---|
| 0-4 | £218.00 |
| 5-15 | £199.00 |
| 16-17 | £248.00 |

> **Note:** Transcribed as printed from the Welsh Government circular of 26 February 2024, on Welsh Government letterhead, signed Alistair Davey. This is the primary source the site had been missing: it confirms the band inversion directly rather than through secondary reports. Rates apply from 1 April, the council convention. The top band is printed '16+', so it is marked openEnded and the maxAge of 17 is this calculator's own cap.

> **On the bands:** The Welsh letter prints the top band as "16+", so it is marked openEnded here. The maxAge of 17 is this calculator's own cap, because the product is for children under 18 and the bands must tile 0 to 17 exactly. Not a transcription error, and not a closed band in the source. The letter also states the rates apply from 1 April, so Wales follows the council convention rather than the DfE tax year.

> **anomalyConfirmed: true.** This looks wrong and is not. Corroborated by:
> - Welsh Government circular of 26 February 2024, signed Alistair Davey (https://www.thefosteringnetwork.org.uk/media/rzzgloqq/nma-letter-2024-25-english-e-_0.pdf): Primary source, on Welsh Government letterhead. Prints 218 pounds for ages 0 to 4 against 199 pounds for 5 to 15. The inversion is how the Welsh Government publishes the rates, not an error in a report of them. The letter itself is now linked rather than the Welsh Government home page.
> - The Welsh rates for 2026/27, held separately in rates.2026-27.json (https://www.gov.wales/): Shows the same inversion two years later, and walking these 2024/25 figures forward through the announced uplifts of 2.6 per cent and 2.2 per cent reproduces all three of those cells exactly. The pattern is stable across years, not a one-off misprint.

> **Shown to the reader:** In Wales the rate for a child under 5 is higher than for a child aged 5 to 15. That is not a mistake on this site. It is how the Welsh Government publishes them.

#### scotland

Source: [Scottish Recommended Allowance, rates announced 29 August 2023, unchanged for 2024/25](https://www.gov.scot/news/new-national-allowance-for-foster-and-kinship-carers/), read 2026-08-31

Uplift on the previous year: 0%

| Age band | Weekly |
|---|---|
| 0-4 | £168.31 |
| 5-15 | £195.81 |
| 16-17 | £268.41 |

> **Note:** The Scottish Recommended Allowance was NOT uprated for 2024/25. The rates announced on 29 August 2023 remained in force for the whole financial year, which is why upliftPercent is 0 rather than absent. Scotland publishes four bands (0-4, 5-10, 11-15, 16+) but pays 5-10 and 11-15 the same, which is the three-band design the SRA is built on and the shape this table uses. gov.scot's own August 2023 release gives 11-15 as 19581, identical to 5-10. Several local authority reproductions of the same table instead show 20251 for 11-15. The primary source wins, so 19581 is what ships. The other bands agree across both. Do not switch to 20251 without a gov.scot page or an archived capture saying so.

#### northern-ireland

Source: [Department of Health (Northern Ireland), Foster care allowances, Model Scheme 2024-25](https://www.health-ni.gov.uk/sites/default/files/publications/health/model-scheme-2024-25.pdf), read 2026-09-01

Uplift on the previous year: 3%

| Age band | Weekly |
|---|---|
| 0-4 | £149.00 |
| 5-10 | £166.00 |
| 11-15 | £187.00 |
| 16-17 | £219.00 |

> **Note:** Read from the Department of Health model scheme PDF on 1 September 2026, Section 1, FOSTER CARE ALLOWANCES, SCALE RATES, 'From 1st April 2024'. Transcribed as printed. The document prints a per-4-weeks column alongside, and all four rows multiply exactly (149x4=596, 166x4=664, 187x4=748, 219x4=876), which is the document checking itself.

### Financial year 2025-26

Effective 2025-04-01 to 2026-03-31.

Two dates, deliberately: councils apply from **2025-04-01**, the DfE states the same rates for a tax year beginning **2025-04-06**. The site pays out on the council convention and says in pounds what the other reading would give.

> Wales is the only gap in this year, and it is deliberate. Northern Ireland and Scotland were sourced on 3 September 2026 from the Department of Health model scheme and an archived gov.scot capture. Wales is null because no Welsh Government rate table has been located after three exhaustive searches: a 2.6 per cent uplift is on record and figures are reported, but only in a reproduced table, which is secondary and not usable. Backdating therefore excludes 2025/26 for Wales and names the excluded year on screen. See OPEN-ITEMS.md item 1b and watchlist.json ciw-nma-bulletins.

#### england

Source: [DfE National Minimum Allowance for foster carers, 2025 to 2026](https://web.archive.org/web/20251130000000/https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering), read 2026-09-03

Uplift on the previous year: 3.55%

| Age band | london | south-east | rest-of-england |
|---|---|---|---|
| 0-2 | £198.00 | £189.00 | £170.00 |
| 3-4 | £201.00 | £196.00 | £176.00 |
| 5-10 | £225.00 | £216.00 | £194.00 |
| 11-15 | £257.00 | £247.00 | £220.00 |
| 16-17 | £299.00 | £288.00 | £258.00 |

#### wales

**Not held for this year.** Backdating excludes 2025-26 for wales and says so on screen.

#### scotland

Source: [Scottish Government, Scottish Recommended Allowance: information for carers and professionals, page updated 27 June 2025](https://web.archive.org/web/20251015000000/https://www.gov.scot/publications/scottish-recommended-allowance-for-foster-and-kinship-carers-information-for-carers-and-professionals/), read 2026-09-03

Uplift on the previous year: 1.7%

| Age band | Weekly |
|---|---|
| 0-4 | £171.17 |
| 5-15 | £199.14 |
| 16-17 | £272.97 |

> **Note:** Scottish Recommended Allowance, from an archived gov.scot capture of 15 October 2025 of the page last updated 27 June 2025. Announced May 2025, backdated to 1 April 2025. The page prints 0-4 at 171.17, 5-10 at 199.14, 11-15 at 199.14 and 16+ at 272.97: 5-10 and 11-15 are IDENTICAL, which is the three-band design (0-4, 5-15, 16-17) presented across four categories to mirror what local authorities use. The table here uses the three bands. An East Renfrewshire reproduction showing 207.60 at 11-15 was wrong, and so were three of its other four figures: it was still printing 2023/24 rates. The primary source wins. Do not re-split 5-15 without a gov.scot page saying the SRA has changed shape.

#### northern-ireland

Source: [Department of Health (Northern Ireland), Model Scheme 2025-26, Section 1, Foster Care Allowances](https://www.health-ni.gov.uk/sites/default/files/2026-05/Foster%20care%20allowances%202025-26.pdf), read 2026-09-03

Uplift on the previous year: 4%

| Age band | Weekly |
|---|---|
| 0-4 | £155.00 |
| 5-10 | £173.00 |
| 11-15 | £194.00 |
| 16-17 | £228.00 |

> **Note:** Read from the Department of Health model scheme PDF, Section 1, FOSTER CARE ALLOWANCES, SCALE RATES, "From 1st April 2025". Transcribed as printed. The per-4-weeks column beside it multiplies exactly on all four rows (155x4=620, 173x4=692, 194x4=776, 228x4=912), which is the document checking itself. Uplift against 2024/25 is 4.0, 4.2, 3.7 and 4.1 per cent, consistent with the announced 4 per cent backdated to 1 April 2025. DO NOT USE the REDUCED RATES table printed beneath, which reads 112.00 / 125.00 / 140.00 / 164.00 a week, about 28 per cent lower. It covers enhanced allowances and short breaks and is not the allowance.

### Financial year 2026-27

Effective 2026-04-01 to 2027-03-31.

Two dates, deliberately: councils apply from **2026-04-01**, the DfE states the same rates for a tax year beginning **2026-04-06**. The site pays out on the council convention and says in pounds what the other reading would give.

#### england

Source: [DfE National Minimum Allowance for foster carers, 2026 to 2027](https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering), read 2026-08-29

Uplift on the previous year: 3.35%

| Age band | london | south-east | rest-of-england |
|---|---|---|---|
| 0-2 | £205.00 | £195.00 | £176.00 |
| 3-4 | £208.00 | £203.00 | £182.00 |
| 5-10 | £233.00 | £223.00 | £201.00 |
| 11-15 | £266.00 | £255.00 | £227.00 |
| 16-17 | £309.00 | £298.00 | £267.00 |

#### wales

Source: [The Fostering Network, national minimum allowances table, reproducing the Welsh 2026 to 2027 rates](https://www.thefosteringnetwork.org.uk/policy-and-campaigns/empowering-children-and-young-people/allowances/), read 2026-09-03

Uplift on the previous year: 2.2%

| Age band | Weekly |
|---|---|
| 0-4 | £229.00 |
| 5-15 | £208.00 |
| 16-17 | £260.00 |

> **Note:** The figures come from The Fostering Network's reproduced table, which is secondary, and verify stays true because of it. The Welsh Government letter carrying the 2026/27 rates has not been located after three searches. wg-nma-2026-27-approval is a separate primary record that the Minister approved the allowance; it carries no rate table, so it confirms the allowance exists and is not the source of these numbers. The two were previously conflated in one citation, which attributed the figures to a page that does not state them.

> **On the bands:** The Welsh letter prints the top band as "16+", so it is marked openEnded here. The maxAge of 17 is this calculator's own cap, because the product is for children under 18 and the bands must tile 0 to 17 exactly. Not a transcription error, and not a closed band in the source. The letter also states the rates apply from 1 April, so Wales follows the council convention rather than the DfE tax year.

> **verify: true.** We doubt this figure and it is held, not trusted.

> **anomalyConfirmed: true.** This looks wrong and is not. Corroborated by:
> - Welsh Government circular of 26 February 2024, signed Alistair Davey (https://www.thefosteringnetwork.org.uk/media/rzzgloqq/nma-letter-2024-25-english-e-_0.pdf): Primary source. Prints 218 pounds for ages 0 to 4 against 199 pounds for 5 to 15, so the inversion is how the Welsh Government publishes the rates and not an error in a secondary report. The letter itself is linked rather than the Welsh Government home page, matching the 2024/25 entry.
> - Fostering news, '2025 Allowance Uplifts Across the UK' (https://fosteringnews.co.uk/fostering/2025-allowance-uplifts-across-the-uk-england-wales-scotland-ni/): Records the 2025/26 Welsh NMA as £224 (0-4), £204 (5-10 and 11-15), £255 (16-17), the same inversion, in an independent year.
> - The Fostering Network, Foster Care Allowances (https://www.thefosteringnetwork.org.uk/policy-and-campaigns/empowering-children-and-young-people/allowances/): Confirms the Welsh Government announced a 2.2% uplift for 2026/27. Applying 2.2% to the 2025/26 figures reproduces this table to the pound: 224 -> 228.9 (£229), 204 -> 208.5 (£208), 255 -> 260.6 (£260).

> **Shown to the reader:** In Wales the rate for a child under 5 is higher than for a child aged 5 to 15. That is not a mistake on this site. It is how the Welsh Government publishes them.

#### scotland

Source: [Scottish Recommended Allowance for foster and kinship carers, Scottish Government, page updated 11 May 2026](https://www.gov.scot/publications/scottish-recommended-allowance-for-foster-and-kinship-carers-information-for-carers-and-professionals/), read 2026-08-31

Uplift on the previous year: 3.8%

| Age band | Weekly |
|---|---|
| 0-4 | £177.68 |
| 5-15 | £206.71 |
| 16-17 | £283.35 |

> **Note:** Scottish Recommended Allowance. A FLOOR with explicit foster/kinship parity. Councils may pay more. Not means tested in the SGO sense. CPI-uprated annually from March 2026.

#### northern-ireland

Source: [HSC (Northern Ireland) fostering allowances, 2026 to 2027](https://www.health-ni.gov.uk/sites/default/files/2026-05/Foster%20care%20allowances%202026-27.pdf), read 2026-09-03

Uplift on the previous year: 3%

| Age band | Weekly |
|---|---|
| 0-4 | £160.00 |
| 5-10 | £179.00 |
| 11-15 | £200.00 |
| 16-17 | £235.00 |

> **Note:** NI pays kinship and non-kinship foster carers the same rate.

---

## 3. Benefit figures

Separate from the rates and deliberately so: allowance rates change on 1 April,
benefit rates change in the first full week of April. Between the two dates the
new allowance rates coexist with the old benefit rates, so these are two
independent lookups and neither is derived from the other.


### 2025-26

Effective from 2025-04-07.

**Child Benefit**, source [Child Benefit and Guardian's Allowance Up-rating Order 2025](https://www.legislation.gov.uk/uksi/2025/292/made), read 2026-09-03

| | Weekly |
|---|---|
| Eldest child | £26.05 |
| Each other child | £17.25 |

**Guardian's Allowance:** £22.10, source [Child Benefit and Guardian's Allowance Up-rating Order 2025](https://www.legislation.gov.uk/uksi/2025/292/made), read 2026-09-03

**Income Support applicable amounts**, source [DWP, Benefit and pension rates 2026 to 2027](https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027), read 2026-08-29

| Element | Weekly |
|---|---|
| singleUnder25 | £72.90 |
| single25Plus | £92.05 |
| couple | £144.65 |
| dependentChild | £84.66 |
| familyPremium | £19.48 |
| disabilityPremium | £43.20 |
| disabilityPremiumCouple | £61.65 |
| carerPremium | £46.40 |

### 2026-27

Effective from 2026-04-06.

**Child Benefit**, source [Child Benefit and Guardian's Allowance Up-rating Order 2026](https://www.legislation.gov.uk/uksi/2026/232/made), read 2026-09-03

| | Weekly |
|---|---|
| Eldest child | £27.05 |
| Each other child | £17.90 |

**Guardian's Allowance:** £22.95, source [Child Benefit and Guardian's Allowance Up-rating Order 2026](https://www.legislation.gov.uk/uksi/2026/232/made), read 2026-09-03

**Income Support applicable amounts**, source [DWP, Benefit and pension rates 2026 to 2027](https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027), read 2026-08-29

| Element | Weekly |
|---|---|
| singleUnder25 | £75.65 |
| single25Plus | £95.55 |
| couple | £150.15 |
| dependentChild | £87.88 |
| familyPremium | £20.22 |
| disabilityPremium | £44.85 |
| disabilityPremiumCouple | £64.00 |
| carerPremium | £48.15 |

---

## 4. The means test, step by step

This models the **DfE Standardised Means Test Model**, which most English
councils use. It is **not statutory** and it pre-dates Universal Credit, so every
result that uses it carries a warning saying so.

**The order matters and is the single most common implementation error.** The
20% disregard comes off INCOME, before any expenditure:

    correct:   (3000 x 0.8) - 2000 = 400
    wrong:     (3000 - 2000) x 0.8 = 800

A property test exists solely to catch that inversion.

### The steps, in order

1. **Countable income**, monthly: net earnings, other income, benefits that
   count, and Child Benefit for the carer's OTHER children.
2. **The 20% disregard**, applied to that income total.
3. **Allowable expenditure**, subtracted: rent or mortgage, council tax,
   essential loan repayments, maintenance paid out, pension contributions,
   childcare, and then basic living costs.
4. **Disposable income**, floored at zero.
5. **Capital tariff**, only where a council's own recorded policy enables it.
6. **The taper**, converting disposable income into the contribution the council
   expects, then converted to a weekly figure as monthly x 12 / 52.

### The three numbers in the model

| Figure | Value | Status |
|---|---|---|
| Income disregard | 20% | From the DfE model |
| Basic living costs | 125% of the Income Support applicable amount | From the DfE model. **Devon publishes 100%**, and where a council publishes its own figure the site uses it |
| The taper | Assumed **pound for pound** | **THERE IS NO NATIONAL RULE.** Confirmed against the 2005 Regulations, the 2017 statutory guidance, the DfE model and the 2024 kinship guidance. Every affected result says the method is assumed and asks the council where its own comes from |

### What is never counted

Disability benefits for the child, criminal injuries compensation, fostering
income for other children, Guardian's Allowance, the special guardianship
allowance itself, Child Benefit for the assessed child, and the childcare
element of Working Tax Credit.

### Child Benefit for the assessed child

**Never deducted by default.** Only where the carer explicitly ticks that their
council does it, and never silently. A runtime assertion throws if a deduction
ever appears without that opt-in.


---

## 5. Backdating

Answers "what should I have been paid since the order?". The period is cut into
segments wherever the correct rate could change, and each segment is priced on
its own:

1. every **1 April**, the financial year boundary
2. every **6 April**, where the DfE's tax year disagrees with it
3. every **birthday that crosses an age band**
4. the **24 month regulation 7 anniversary**
5. the start of the period

Where a segment falls in a year whose rates are not held, that year is **excluded
and named**. It is never estimated. The total says which years it covers.

Backdating handles **one child at a time**. Apportioning a household contribution
across a period with age band changes at different dates is not specified
anywhere, so the tool refuses rather than inventing an allocation.


---

## 6. The rules that stop a wrong figure reaching a carer

These are runtime assertions, not wording on a page. If the engine ever computes
a result that violates one, it throws and the site says it cannot give a figure,
rather than showing the number.

| Rule | What it forbids |
|---|---|
| R1 | Outputting a fixed fraction of the fostering rate as the answer, without a means test. Two thirds, 58%, 75% and 50% are all caught |
| R2 | Deducting Child Benefit without an explicit opt-in, or deducting it from someone on means-tested benefits without raising the critical warning |
| R3 | Any figure without the citation it derives from |
| R4 | Showing a former foster carer less than their previous fostering allowance inside the 24 month window |
| R5 | Any English law reaching a Scottish result. Special guardianship orders do not exist in Scots law |
| SANITY | A negative allowance, or an estimate above the maximum with no floor applied |


---

## 7. What we hold about individual councils

Naming a council in public is the most defamation-shaped thing this site does, so
an entry only reaches a reader when it has a stored, dated, live source. An entry
without one is invisible to the engine: the calculation falls back to the
national minimums and says we do not hold that council's policy.

**6 published, 0 held back.**


### Devon County Council

- Region: rest-of-england
- Policy as we read it: Allowance aligned to the basic fostering allowance rate, with the standardised means-test model. Devon's procedures state that paying a fixed percentage of the fostering allowance would not be lawful. The living costs disregard is set at 100% of the Income Support applicable amount rather than the model's 125%, with tiered housing disregards.
- Fixed fraction of the fostering rate: **none (checked, and the answer is none)**
- Basic living costs: **100%** of the Income Support amount, against the model's 125%
- Ombudsman finding (LGSCO_UPHELD), decided 2024-01-25: In January 2024 the Ombudsman found Devon at fault for deducting Child Benefit from all special guardians on Universal Credit as a blanket rule, without looking at individual circumstances. Recalculation and refunds were ordered.
  - Source: https://www.lgo.org.uk/decisions/children-s-care-services/friends-and-family-carers/23-000-973
  - **Concerns a FORMER policy.** The site says so with the finding.
  - Superseded: A later complaint about the way Devon calculates allowances now was not upheld. The Ombudsman found its current practice consistent with government guidance. (https://www.lgo.org.uk/decisions/children-s-care-services/friends-and-family-carers/24-003-172)
- Source: https://devoncs.trixonline.co.uk/chapter/applications-for-special-guardianship-orders, verified 2026-08-31

### Leeds City Council

- Region: rest-of-england
- Policy as we read it: Revised Special Guardianship Support Offer of March 2024. Uses the standardised means-test model, with support that is not means tested for carers of children subject to non-agency orders who already receive a means-tested benefit. The maximum is pegged to Leeds's own weekly fostering allowance rates.
- Fixed fraction of the fostering rate: **none (checked, and the answer is none)**
- **Policy under review.** Leeds City Council's own procedures manual says its special guardianship financial support information is under review. What is shown here is the revised offer of March 2024, which is the last version it published.
- Source: https://democracy.leeds.gov.uk/documents/s254642/Special%20Guardianship%20Order%20Support%20Cover%20Report%20010324.pdf, verified 2026-08-31

### North Tyneside Council

- Region: rest-of-england
- Policy as we read it: Equivalence to the maximum fostering allowance, uplifted annually in line with the National Minimum Allowance, means tested. The council abolished its earlier percentage model in 2018.
- Fixed fraction of the fostering rate: **none (checked, and the answer is none)**
- Ombudsman finding (LGSCO_UPHELD), decided 2018-02-27: In February 2018 the Ombudsman found North Tyneside at fault for calculating special guardianship allowances as a percentage of its fostering allowance. The council identified 171 families who may not have received the right support, and payments were backdated to November 2013. North Tyneside abolished the percentage model that year.
  - Source: https://web.archive.org/web/20231216202817/https://www.lgo.org.uk/assets/attach/4322/REPORT-17002928-N-Tyneside.pdf
  - **Concerns a FORMER policy.** The site says so with the finding.
- Source: https://northtyneside.gov.uk/sites/default/files/web-page-related-files/20250321%20-%20Decision%20Record%20-%20Fostering%20Allowance.pdf, verified 2026-08-29

### Shropshire Council

- Region: rest-of-england
- Policy as we read it: Special Guardianship Allowances Policy agreed by Cabinet in 2021, including backdated payments to special guardians of children who were previously looked after
- Fixed fraction of the fostering rate: **none (checked, and the answer is none)**
- Source: https://shropshire.gov.uk/committee-services/documents/s26540/Special Guardianship Allowances Policy.pdf, verified 2026-08-29

### Lincolnshire County Council

- Region: rest-of-england
- Policy as we read it: Uses the DfE standardised means-test model and publishes a full worked example of the calculation. Its own policy classifies that model as non-statutory guidance
- Fixed fraction of the fostering rate: **none (checked, and the answer is none)**
- Source: https://www.lincolnshire.gov.uk/directory-record/82363/special-guardianship-allowance-assessment-framework, verified 2026-08-29

### Derby City Council

- Region: rest-of-england
- Policy as we read it: Allowance set at the equivalent of Derby's basic fostering rate for a child of that age
- Fixed fraction of the fostering rate: **none (checked, and the answer is none)**
- Source: https://derbycsc.trixonline.co.uk/chapter/special-guardianship-orders-and-derby-support-scheme, verified 2026-08-29

---

## 8. Which council sits in which region

England's rates vary by region, so every English council has to map to one.

**153 authorities mapped**, against a declared expected count of
153. A build gate fails if those two ever disagree, so a silent drop is caught.

**This mapping is ours, not the government's.** ONS Government Office Region (DfE publishes no authority-level list)

That is disclosed on the region picker itself, where the reader is told their own
choice overrides ours. It is the honest position: the DfE publishes rates by
region and publishes no list of which authority is in which region.


---

## 9. Kinship Zones pilot

7 authorities. In a pilot area, a carer whose child would otherwise be in
care gets the full fostering national minimum allowance with **no means test**.

Councils: bexley, bolton, newcastle-upon-tyne, north-east-lincolnshire, medway, thurrock, wiltshire

Last verified 2026-08-29. Source: [Kinship Zones - kinship allowance pilot (2026-2029)](https://www.communitycare.co.uk/content/news/councils-to-test-paying-kinship-carers-to-look-after-children-who-would-otherwise-go-into-care), read 2026-08-29


---

## 10. Every source

56 in total. **3 still without a URL**, listed first.


### Still needing a link

- **LGSCO decision, Southend-on-Sea (19 003 363, 5 October 2020)**
- **Lincolnshire County Council, Special Guardianship Allowance Assessment Framework**
- **North Tyneside Council, Decision Record: Foster Care, Special Guardianship, Adoption and Child Arrangement Order Allowance Increases**

### All sources

| Source | Kind | Read | Link |
|---|---|---|---|
| Children Act 1989, s.14A | statute | 2026-08-29 | [link](https://www.legislation.gov.uk/ukpga/1989/41/section/14A) |
| Children Act 1989, s.14F(3) | statute | 2026-09-03 | [link](https://www.legislation.gov.uk/ukpga/1989/41/section/14F) |
| Child Benefit and Guardian's Allowance Up-rating Order 2025 | regulation | 2026-09-03 | [link](https://www.legislation.gov.uk/uksi/2025/292/made) |
| Child Benefit and Guardian's Allowance Up-rating Order 2026 | regulation | 2026-09-03 | [link](https://www.legislation.gov.uk/uksi/2026/232/made) |
| Care Inspectorate Wales, National Minimum Allowances for Foster Carers 2023 to 2024, bulletin of 27 January 2023 | dataset | 2026-08-31 | [link](https://content.govdelivery.com/accounts/UKWALES_CSSIW_INT/bulletins/3450cef) |
| CoramBAAF Practice Note 75 - special guardianship financial support | guidance | 2026-09-03 | [link](https://corambaaf.org.uk/sites/default/files/Members%20Area/Resources/Practice%20Notes/PN%2075%20Financial%20Support%20for%20Special%20Guardians_Englandv2.pdf) |
| Derby City Council, Special Guardianship Orders and Derby Support Scheme | guidance | 2026-08-29 | [link](https://derbycsc.trixonline.co.uk/chapter/special-guardianship-orders-and-derby-support-scheme) |
| Devon County Council, Applications for Special Guardianship Orders (procedures manual), last updated 24 October 2024 | guidance | 2026-08-31 | [link](https://devoncs.trixonline.co.uk/chapter/applications-for-special-guardianship-orders) |
| DfE Special Guardianship Guidance (Jan 2017), para 65 | guidance | 2026-08-29 | [link](https://www.gov.uk/government/publications/special-guardianship-guidance) |
| DfE National Minimum Allowance for foster carers, 2024 to 2025 (National Archives snapshot) | dataset | 2026-08-30 | [link](https://web.archive.org/web/20250302000000/https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering) |
| GOV.UK, Help with the cost of fostering, capture of 2 March 2025 | guidance | 2026-09-03 | [link](https://web.archive.org/web/20250302000000/https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering) |
| DfE National Minimum Allowance for foster carers, 2025 to 2026 | dataset | 2026-09-03 | [link](https://web.archive.org/web/20251130000000/https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering) |
| DfE National Minimum Allowance for foster carers, 2026 to 2027 | dataset | 2026-08-29 | [link](https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering) |
| GOV.UK, Help with the cost of fostering, on allowances after a child is old enough to leave foster care | guidance | 2026-09-03 | [link](https://web.archive.org/web/20251130000000/https://www.gov.uk/support-for-foster-parents/help-with-the-cost-of-fostering) |
| DWP, Benefit and pension rates 2026 to 2027 | dataset | 2026-08-29 | [link](https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027) |
| The Fostering Network, Foster Care Allowances | dataset | 2026-08-29 | [link](https://www.thefosteringnetwork.org.uk/policy-and-campaigns/empowering-children-and-young-people/allowances/) |
| Fostering news, '2025 Allowance Uplifts Across the UK' | dataset | 2026-08-29 | [link](https://fosteringnews.co.uk/fostering/2025-allowance-uplifts-across-the-uk-england-wales-scotland-ni/) |
| HSC (Northern Ireland) fostering allowances, 2026 to 2027 | dataset | 2026-09-03 | [link](https://www.health-ni.gov.uk/sites/default/files/2026-05/Foster%20care%20allowances%202026-27.pdf) |
| DfE, Kinship Care: statutory guidance for local authorities (October 2024) | guidance | 2026-08-29 | [link](https://assets.publishing.service.gov.uk/media/670d3ed5e84ae1fd8592f2fa/Kinship_Care_-_statutory_guidance_for_local_authorities__October_2024.pdf) |
| Kinship Zones - kinship allowance pilot (2026-2029) | dataset | 2026-08-29 | [link](https://www.communitycare.co.uk/content/news/councils-to-test-paying-kinship-carers-to-look-after-children-who-would-otherwise-go-into-care) |
| Barrett v Kirklees MBC [2010] EWHC 467 (Admin) | case | 2026-09-03 | [link](https://www.bailii.org/ew/cases/EWHC/Admin/2010/467.html) |
| Leeds City Council, Revised Special Guardianship Support Offer, cover report, 1 March 2024 | guidance | 2026-08-31 | [link](https://democracy.leeds.gov.uk/documents/s254642/Special%20Guardianship%20Order%20Support%20Cover%20Report%20010324.pdf) |
| R (B) v Lewisham LBC [2008] EWHC 738 (Admin) | case | 2026-09-03 | [link](https://www.bailii.org/ew/cases/EWHC/Admin/2008/738.html) |
| LGSCO decision, friends and family carers (22 011 906) | ombudsman | 2026-08-31 | [link](https://www.lgo.org.uk/decisions/children-s-care-services/friends-and-family-carers/22-011-906) |
| LGSCO decision, friends and family carers (22 018 116) | ombudsman | 2026-08-31 | [link](https://www.lgo.org.uk/decisions/children-s-care-services/friends-and-family-carers/22-018-116) |
| LGSCO decision, Devon County Council (23 000 973, 25 January 2024) | ombudsman | 2026-08-31 | [link](https://www.lgo.org.uk/decisions/children-s-care-services/friends-and-family-carers/23-000-973) |
| LGSCO decision, Devon County Council (24 003 172), not upheld | ombudsman | 2026-08-31 | [link](https://www.lgo.org.uk/decisions/children-s-care-services/friends-and-family-carers/24-003-172) |
| LGSCO public report, North Tyneside Council (17 002 928, 27 February 2018) | ombudsman | 2026-09-01 | [link](https://web.archive.org/web/20231216202817/https://www.lgo.org.uk/assets/attach/4322/REPORT-17002928-N-Tyneside.pdf) |
| LGSCO decision, Rochdale MBC (17 010 167, May 2019), council's judicial review challenge dismissed | ombudsman | 2026-09-01 | [link](https://www.lgo.org.uk/decisions/children-s-care-services/friends-and-family-carers/17-010-167) |
| LGSCO decision, Southend-on-Sea (19 003 363, 5 October 2020) | ombudsman | 2026-08-31 | **none** |
| Lincolnshire County Council, Special Guardianship Allowance Assessment Framework | guidance | 2026-08-29 | **none** |
| R (TT) v Merton LBC [2012] EWHC 2055 (Admin) | case | 2026-09-03 | [link](https://caselaw.nationalarchives.gov.uk/ewhc/admin/2012/2055) |
| Department of Health (Northern Ireland), Foster care allowances, Model Scheme 2024-25 | dataset | 2026-09-01 | [link](https://www.health-ni.gov.uk/sites/default/files/publications/health/model-scheme-2024-25.pdf) |
| Department of Health (Northern Ireland), Model Scheme 2025-26, Section 1, Foster Care Allowances | guidance | 2026-09-03 | [link](https://www.health-ni.gov.uk/sites/default/files/2026-05/Foster%20care%20allowances%202025-26.pdf) |
| North Tyneside Council, Decision Record: Foster Care, Special Guardianship, Adoption and Child Arrangement Order Allowance Increases | guidance | 2026-08-29 | **none** |
| UK Parliament written question 14259 (National Minimum Allowance uplifts) | dataset | 2026-08-29 | [link](https://questions-statements.parliament.uk/written-questions/detail/2024-11-13/14259) |
| Special Guardianship Regulations 2005, reg 10 | regulation | 2026-09-03 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/10) |
| Special Guardianship Regulations 2005, reg 11 | regulation | 2026-09-03 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/11) |
| Special Guardianship Regulations 2005, reg 13(2) | regulation | 2026-09-03 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/13) |
| Special Guardianship Regulations 2005, reg 18(2)(a) | regulation | 2026-09-03 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/18) |
| Special Guardianship Regulations 2005, reg 5 | regulation | 2026-08-29 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/5) |
| Special Guardianship Regulations 2005, reg 6 | regulation | 2026-08-29 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/6) |
| Special Guardianship Regulations 2005, reg 6(2)(b) | regulation | 2026-09-01 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/6) |
| Special Guardianship Regulations 2005, reg 7 | regulation | 2026-08-29 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/7) |
| Special Guardianship Regulations 2005, reg 9 | regulation | 2026-08-29 | [link](https://www.legislation.gov.uk/uksi/2005/1109/regulation/9) |
| Shropshire Council, Special Guardianship Allowances Policy (Cabinet, 8 February 2021) | guidance | 2026-08-29 | [link](https://shropshire.gov.uk/committee-services/documents/s26540/Special Guardianship Allowances Policy.pdf) |
| Scottish Recommended Allowance, rates announced 29 August 2023, unchanged for 2024/25 | dataset | 2026-08-31 | [link](https://www.gov.scot/news/new-national-allowance-for-foster-and-kinship-carers/) |
| Scottish Government, Scottish Recommended Allowance: information for carers and professionals, page updated 27 June 2025 | guidance | 2026-09-03 | [link](https://web.archive.org/web/20251015000000/https://www.gov.scot/publications/scottish-recommended-allowance-for-foster-and-kinship-carers-information-for-carers-and-professionals/) |
| Scottish Recommended Allowance for foster and kinship carers, Scottish Government, page updated 11 May 2026 | dataset | 2026-08-31 | [link](https://www.gov.scot/publications/scottish-recommended-allowance-for-foster-and-kinship-carers-information-for-carers-and-professionals/) |
| Scottish Government, Foster and kinship carers, Scottish Recommended Allowance: implementation review | dataset | 2026-09-03 | [link](https://www.gov.scot/publications/review-implementation-scottish-recommended-allowance-foster-kinship-carers/) |
| R (X) v Tower Hamlets LBC [2013] EWCA Civ 904 | case | 2026-09-03 | [link](https://caselaw.nationalarchives.gov.uk/ewca/civ/2013/904) |
| Universal Credit (Removal of Two Child Limit) Act 2026 c.13 | statute | 2026-09-03 | [link](https://www.legislation.gov.uk/ukpga/2026/13) |
| Welsh Government, consultation on changes to two codes of practice: Part 6 and Special Guardianship Orders, 12 February to 7 April 2026 | guidance | 2026-08-31 | [link](https://www.gov.wales/written-statement-launch-consultation-revisions-part-6-and-special-guardianship-codes-practice) |
| Welsh Government, National Minimum Allowances for foster carers 2024 to 2025, circular of 26 February 2024 | dataset | 2026-09-03 | [link](https://www.thefosteringnetwork.org.uk/media/rzzgloqq/nma-letter-2024-25-english-e-_0.pdf) |
| The Fostering Network, national minimum allowances table, reproducing the Welsh 2026 to 2027 rates | dataset | 2026-09-03 | [link](https://www.thefosteringnetwork.org.uk/policy-and-campaigns/empowering-children-and-young-people/allowances/) |
| Welsh Government, decision reports 2026, recording ministerial approval of the National Minimum Allowances for 2026 to 2027 | guidance | 2026-09-03 | [link](https://www.llyw.cymru/adroddiadau-ar-benderfyniadau-2026) |

---

## 11. What the site does not know, and says so

Every one of these is a deliberate, visible gap. None is filled with an estimate.


### ciw-nma-bulletins

**Waiting for:** The Welsh National Minimum Allowance letter for 2025/26. ACCEPTED GAP as at 3 September 2026 after three unsuccessful searches. Two routes remain, neither requiring more searching. First, a guessable path: the 2024/25 letter also exists at /sites/default/files/2024-05/NMA%20Letter%202024-25%20-%20English%20(E)_0.pdf on The Fostering Network, so try /sites/default/files/2025-04/, 2025-05/ and 2025-06/ with the year changed. Second, and more likely to work: ask. The letters go out by email, which is why they are not on the open web. The addresses are printed on the 2024/25 letter itself: plantsynderbyngofal@llyw.cymru, and Alistair Davey, Deputy Director Enabling People, Alistair.Davey@gov.wales. One email would likely close both this and the 2026/27 letter.

**Why it matters:** Searched to exhaustion: The Fostering Network media library, the govdelivery UKWALES_CSSIW_INT account, Care Inspectorate Wales archives in both languages, gov.wales and llyw.cymru written statements and decision reports, Foster Wales and twelve local authorities, council committee repositories, and National Archives snapshots from February and March 2025. The govdelivery bulletin IDs are non-sequential hex and cannot be derived. A 2.6 per cent uplift was announced in February 2025 and figures of 224 / 204 / 255 are reported, inversion intact, but only from a reproduced table and not from the Welsh Government letter. Secondary, so not usable. The cost of the gap is one year of Welsh backdating, which the site already handles by naming the excluded year. That is a far smaller problem than publishing a rate we cannot source.

**Where to look:** https://content.govdelivery.com/accounts/UKWALES_CSSIW_INT/bulletins/3450cef

_Next check due after 2026-12-31._

### wg-codes-outcome

**Waiting for:** The outcome of the Welsh consultation on the Part 6 and Special Guardianship Orders codes of practice.

**Why it matters:** The consultation closed on 7 April 2026. The draft would require all services to pay the national minimum allowance. Until the outcome is published nothing on this site may state it as the law, and when it lands the Wales pages need rewriting.

**Where to look:** https://www.gov.wales/written-statement-launch-consultation-revisions-part-6-and-special-guardianship-codes-practice

_Next check due after 2026-10-01._

### leeds-final-offer

**Waiting for:** The final version of Leeds City Council's revised special guardianship support offer.

**Why it matters:** Leeds says its financial support information is under review, so the March 2024 offer is served with an on-screen note saying so. The Child Benefit position is deliberately not stated, because the only source for it is a freedom of information response that itself says the policy is under review.

**Where to look:** https://leedscs.trixonline.co.uk/chapter/applications-for-special-guardianship-orders

_Next check due after 2026-11-30._

### wg-sgo-code-of-practice

**Waiting for:** The final Special Guardianship Orders Code of Practice for Wales.

**Why it matters:** The consultation that closed on 7 April 2026 covers TWO codes, and one of them is the SGO code. That is the Welsh equivalent of the statutory guidance the whole English side of this site rests on, so when it is finalised the Wales pages need more than a rates refresh. Tracked separately from the Part 6 code for that reason. As at 2 September 2026 the responses are still being reviewed, and a fuller review was signalled for early in the next Senedd term.

**Where to look:** https://www.gov.wales/written-statement-launch-consultation-revisions-part-6-and-special-guardianship-codes-practice

_Next check due after 2026-12-31._

### corambaaf-substitute

**Waiting for:** Lincolnshire County Council's published Special Guardianship Allowance Assessment Framework, which describes the DfE means test model as non-statutory guidance in its own words. Find a permanent address for it.

**Why it matters:** CoramBAAF Practice Note 75 is the only source cited for the proposition that the means test model is not law. It resolves publicly but sits on a members-area path and could be withdrawn without notice. A council conceding the point in its own published policy is a better citation than a practice note, and it removes a single point of failure.

_Next check due after 2026-10-31._

---

## 12. The assumptions, stated plainly

If you check nothing else, check these. Each is something the site does because
no published rule says otherwise, and each is disclosed to the reader where it
affects their figure.

1. **The taper is pound for pound.** No national rule exists. Section 4.
2. **Basic living costs are 125%** of the Income Support applicable amount,
   except where a council publishes its own figure.
3. **Region mapping** rests on ONS Government Office Regions, because the DfE
   publishes no authority-level list. Section 8.
4. **Rates apply from 1 April**, the council convention, not the DfE's 6 April
   tax year. Both are true of different things; the site pays out on what a carer
   is actually paid and states the difference in pounds.
5. **Age bands come from the current rate table** when backdating. They have been
   stable across every sourced year, and a change would fail a data gate.
6. **The capital rule is off by default.** It runs only where a council's own
   recorded policy enables it.


---

## 13. For a developer: how it all works

Sections 1 to 12 say what the calculator does. This section says how, and where.

Everything below is read from the source when this file is generated, so it
cannot describe code that no longer exists.

### 13.1 The shape of the whole thing

Four parts. Only the first one calculates anything.

| Part | What it is |
|---|---|
| `packages/engine` | The calculator. Pure TypeScript: no DOM, no network, no dates from the system clock unless you pass them in |
| `packages/letters` | The letters a carer sends their council. Takes a result, returns text |
| `apps/web` | The website. Next.js, exported as static HTML. Calls the engine, never does arithmetic itself |
| `/data` | Every figure. Rates, benefits, councils, sources. No number lives in code |

The engine is a separate package on purpose. It can be tested on its own, and
an advice charity could embed it without taking the website.

**Money is never a float.** Everything is whole pence as integers, and
`money.ts` brands the type so a raw `number` is a compile error. Rounding in the
wrong place is the easiest way to produce a figure that is quietly wrong.

### 13.2 One calculation, start to finish

Entry point: `calculate()` in `packages/engine/src/engine.ts`.

| # | What happens | File | Function |
|---|---|---|---|
| 1 | Validate the input. Anything malformed is rejected here, never later | `schema.ts` | `parseCalculatorInput` |
| 2 | Pick the rate table whose date range contains the date being calculated | `dates.ts` | `selectRateTable` |
| 3 | Route by nation. Scotland has no special guardianship in law, so it leaves here | `regimes/scotland.ts` | `scotlandPath` |
| 4 | Route to the Kinship Zones pilot, where eligible. Full fostering rate, no means test | `regimes/kinshipZone.ts` | `kinshipZonePath` |
| 5 | Everything else: England, Wales and Northern Ireland | `regimes/sgo.ts` | `sgoPath` |
| 6 | Per child, find the age band from date of birth or stated age | `rates.ts` | `resolveAgeBand` |
| 7 | Look up the rate for that nation, region and band, and record the citation it came from | `rates.ts` | `lookupRate` |
| 8 | Add the warnings that are true of every result, whatever the numbers | `standingFlags.ts` | `standingFlags` |
| 9 | Add the warnings that come from the council's own recorded policy | `councilPolicy.ts` | `councilPolicyFlags` |
| 10 | Run the means test, but only if the carer gave finances. The 20% disregard comes off income FIRST | `meansTest.ts` | `runMeansTest` |
| 11 | Apply the taper to disposable income | `meansTest.ts` | `applyTaper` |
| 12 | Apply the regulation 7 floor, on the household total, inside the 24 month window | `resolve.ts` | `withinReg7Window` |
| 13 | Order the warnings and remove duplicates | `flags.ts` | `sortFlags` |
| 14 | Assemble the result | `result.ts` | `finalise` |
| 15 | The last gate. Every rule in section 6 is asserted here. A violation throws instead of showing a figure | `guardrails.ts` | `assertGuardrails` |

This table is checked, not typed. Rename a file or delete a function and
`pnpm export:facts` refuses to run until the map is corrected.

### 13.3 Every engine file: what it does, what it exports, what it needs

Read this as a dependency list. A file can only be understood alongside the
files in its **Imports** column, and can only be changed with care if its
**Used by** column is long.


#### `backdating.ts`

Backdating module, spec §16.

- **Exports:** `BACKDATING_CAVEATS`, `BackdatingInput`, `BackdatingResult`, `BackdatingSegment`, `SegmentReason`, `calculateBackdating`, `nthBirthday`, `pence`, `segmentBoundaries`
- **Imports:** `dates`, `deps`, `errors`, `money`, `rates`, `resolve`, `types`
- **Used by:** `index`

#### `councilPolicy.ts`

What we hold about an individual council, and what it is safe to say.

- **Exports:** `capitalFor`, `councilNameFor`, `councilPolicyFlags`, `isInKinshipZone`, `isKinshipZoneEligible`, `livingCostsMultiplierFor`, `taperFor`
- **Imports:** `deps`, `errors`, `flags`, `meansTest`, `referenceData`, `types`
- **Used by:** `engine`, `regimes/kinshipZone`, `regimes/sgo`, `standingFlags`

#### `dates.ts`

Dates and financial years, spec §11 [HARD].

- **Exports:** `addDays`, `addMonths`, `ageAt`, `ageBandChangeDates`, `daysBetween`, `financialYearBoundaries`, `financialYearOf`, `isoDate`, `monthsBetween`, `nthBirthday`, `onOrAfter`, `onOrBefore`, `selectBenefitTable`, `selectRateTable`, `todayUtc`
- **Imports:** `errors`, `types`
- **Used by:** `backdating`, `engine`, `guardrails`, `index`, `resolve`

#### `deps.ts`

The reference data the engine calculates against.

- **Exports:** `EngineDeps`, `defaultDeps`, `resolveDeps`
- **Imports:** `referenceData`, `types`
- **Used by:** `backdating`, `councilPolicy`, `engine`, `rates`, `regimes/kinshipZone`, `regimes/scotland`, `regimes/sgo`, `standingFlags`

#### `engine.ts`

The calculation entry point, spec §13.

- **Exports:** `EngineDeps`, `ageOf`, `calculate`, `defaultDeps`, `isKinshipZoneEligible`, `lookupRate`, `monthsSinceOrder`, `regimeFor`, `resolveAgeBand`, `resolveEnglandRegion`
- **Imports:** `councilPolicy`, `dates`, `deps`, `rates`, `regimes/kinshipZone`, `regimes/scotland`, `regimes/sgo`, `resolve`, `schema`, `types`
- **Used by:** `index`

#### `errors.ts`

Engine error taxonomy.

- **Exports:** `DataError`, `EngineError`, `MoneyError`, `ValidationError`
- **Imports:** nothing. This file is a leaf
- **Used by:** `backdating`, `councilPolicy`, `dates`, `guardrails`, `index`, `meansTest`, `money`, `rates`, `referenceData`, `regimes/sgo`, `schema`

#### `featureFlags.ts`

Feature flags and rollout — spec §39.

- **Exports:** `FLAGS`, `FeatureFlags`
- **Imports:** nothing. This file is a leaf
- **Used by:** `index`

#### `flagCatalogue.ts`

The 34 warnings, spec §17.

- **Exports:** `FLAG_CATALOGUE`
- **Imports:** `flagTypes`, `money`, `types`
- **Used by:** `flags`

#### `flagTypes.ts`

What a warning is, separately from what the warnings say.

- **Exports:** `FlagContext`, `FlagSpec`
- **Imports:** `types`
- **Used by:** `flagCatalogue`, `flags`

#### `flags.ts`

Assembling and ordering the warnings, spec §17.

- **Exports:** `FLAG_CATALOGUE`, `FLAG_ORDER`, `FlagContext`, `FlagSpec`, `dedupeFlags`, `makeFlag`, `sortFlags`
- **Imports:** `flagCatalogue`, `flagTypes`, `referenceData`, `types`
- **Used by:** `councilPolicy`, `index`, `regimes/kinshipZone`, `regimes/scotland`, `regimes/sgo`, `result`, `standingFlags`

#### `guardrails.ts`

Guardrails, spec §15.

- **Exports:** `GuardrailViolation`, `assertGuardrails`
- **Imports:** `dates`, `errors`, `resolve`, `types`
- **Used by:** `index`, `result`

#### `index.ts`

@sgo/engine — the Special Guardianship allowance calculation engine.

- **Exports:** `BACKDATING_CAVEATS`, `BENEFIT_TABLES`, `BackdatingInput`, `BackdatingResult`, `BackdatingSegment`, `CORE_LIVING_COSTS_MULTIPLIER`, `COUNTABLE_INCOME`, `DEFAULT_CAPITAL`, `DEFAULT_TAPER`, `DISREGARDED_INCOME`, `DISREGARD_RATE`, `DataError`, `ENGINE_VERSION`, `EngineDeps`, `EngineError`, `FLAGS`, `FLAG_CATALOGUE`, `FeatureFlags`, `FlagContext`, `GuardrailViolation`, `KINSHIP_ZONES`, `LA_NAMES`, `LA_OVERRIDES_ALL`, `LA_REGION_MAP`, `LA_REGION_MAP_META`, `MAX_MONEY_PENCE`, `MoneyError`, `RATE_TABLES`, `REG7_WINDOW_MONTHS`, `SegmentReason`, `ValidationError`, `ZERO`, `add`, `addDays`, `addMonths`, `ageAt`, `ageBandChangeDates`, `ageOf`, `allCitationIds`, `applyTaper`, `apportion`, `assertGuardrails`, `calculate`, `calculateBackdating`, `calculatorInputSchema`, `carerInputSchema`, `childInputSchema`, `cite`, `clampMin0`, `daysBetween`, `dedupeFlags`, `defaultDeps`, `financesInputSchema`, `financialYearBoundaries`, `financialYearOf`, `formatMoney`, `hasUnpublishableLaOverride`, `hasUnpublishableLaOverrideIn`, `incomeSupportApplicableAmountWeekly`, `isKinshipZoneEligible`, `isPublishable`, `isoDate`, `lookupRate`, `makeFlag`, `max`, `meansTestAvailable`, `min`, `monthlyToWeekly`, `monthsBetween`, `monthsSinceOrder`, `mul`, `nthBirthday`, `parseCalculatorInput`, `parseMoney`, `pence`, `publishableLaOverride`, `publishableLaOverrideIn`, `regimeFor`, `resolveAgeBand`, `resolveEnglandRegion`, `runMeansTest`, `segmentBoundaries`, `selectBenefitTable`, `selectRateTable`, `sortFlags`, `sub`, `taperConfigSchema`, `tariffIncome`, `todayUtc`, `weeklyToAnnual`, `weeklyToMonthly`, `withinReg7Window`
- **Imports:** `backdating`, `dates`, `engine`, `errors`, `featureFlags`, `flags`, `guardrails`, `meansTest`, `money`, `referenceData`, `resolve`, `schema`, `types`
- **Used by:** nothing inside the engine

#### `meansTest.ts`

Means test module, spec §14.

- **Exports:** `CORE_LIVING_COSTS_MULTIPLIER`, `COUNTABLE_INCOME`, `CountableIncomeKind`, `DEFAULT_CAPITAL`, `DEFAULT_TAPER`, `DISREGARDED_INCOME`, `DISREGARD_RATE`, `DisregardedIncomeKind`, `applyTaper`, `incomeSupportApplicableAmountWeekly`, `meansTestAvailable`, `runMeansTest`, `tariffIncome`
- **Imports:** `errors`, `money`, `types`
- **Used by:** `councilPolicy`, `index`, `regimes/sgo`

#### `money.ts`

Money handling, spec §10 [HARD].

- **Exports:** `Pence`, `ZERO`, `add`, `apportion`, `clampMin0`, `formatMoney`, `max`, `min`, `monthlyToWeekly`, `mul`, `parseMoney`, `pence`, `sub`, `weeklyToAnnual`, `weeklyToMonthly`
- **Imports:** `errors`
- **Used by:** `backdating`, `flagCatalogue`, `index`, `meansTest`, `rates`, `regimes/kinshipZone`, `regimes/scotland`, `regimes/sgo`, `result`, `types`

#### `rates.ts`

Looking up what a nation, region and age band are worth.

- **Exports:** `citeRateSource`, `lookupRate`, `regimeFor`, `resolveAgeBand`, `resolveEnglandRegion`
- **Imports:** `deps`, `errors`, `money`, `referenceData`, `resolve`, `types`
- **Used by:** `backdating`, `engine`, `regimes/kinshipZone`, `regimes/scotland`, `regimes/sgo`, `result`

#### `referenceData.ts`

Reference data access.

- **Exports:** `BENEFIT_TABLES`, `ENGINE_VERSION`, `KINSHIP_ZONES`, `LA_NAMES`, `LA_OVERRIDES_ALL`, `LA_REGION_MAP`, `LA_REGION_MAP_META`, `RATE_TABLES`, `allCitationIds`, `cite`, `hasUnpublishableLaOverride`, `hasUnpublishableLaOverrideIn`, `isPublishable`, `publishableLaOverride`, `publishableLaOverrideIn`
- **Imports:** `errors`, `types`
- **Used by:** `councilPolicy`, `deps`, `flags`, `index`, `rates`, `regimes/kinshipZone`, `regimes/sgo`, `result`, `standingFlags`

#### `regimes/kinshipZone.ts`

The Kinship Zones pilot, spec §13.5.

- **Exports:** `kinshipZonePath`
- **Imports:** `councilPolicy`, `deps`, `flags`, `money`, `rates`, `referenceData`, `resolve`, `result`, `standingFlags`, `types`
- **Used by:** `engine`

#### `regimes/scotland.ts`

Scotland, spec §13.4.

- **Exports:** `scotlandPath`
- **Imports:** `deps`, `flags`, `money`, `rates`, `resolve`, `result`, `types`
- **Used by:** `engine`

#### `regimes/sgo.ts`

England, Wales and Northern Ireland, spec §13.

- **Exports:** `sgoPath`
- **Imports:** `councilPolicy`, `deps`, `errors`, `flags`, `meansTest`, `money`, `rates`, `referenceData`, `resolve`, `result`, `standingFlags`, `types`
- **Used by:** `engine`

#### `resolve.ts`

Working out where a carer stands, from whichever answer they gave.

- **Exports:** `REG7_WINDOW_MONTHS`, `ageOf`, `monthsSinceOrder`, `withinReg7Window`
- **Imports:** `dates`, `types`
- **Used by:** `backdating`, `engine`, `guardrails`, `index`, `rates`, `regimes/kinshipZone`, `regimes/scotland`, `regimes/sgo`, `standingFlags`

#### `result.ts`

Assembling the final result, and the last gate before it leaves the engine.

- **Exports:** `FinaliseOptions`, `finalise`
- **Imports:** `flags`, `guardrails`, `money`, `rates`, `referenceData`, `types`
- **Used by:** `regimes/kinshipZone`, `regimes/scotland`, `regimes/sgo`

#### `schema.ts`

Zod schemas, spec §6 and the validation table at §20.1.

- **Exports:** `MAX_MONEY_PENCE`, `calculatorInputSchema`, `carerInputSchema`, `childInputSchema`, `englandRegionSchema`, `financesInputSchema`, `meansTestedBenefitSchema`, `nationSchema`, `parseCalculatorInput`, `taperConfigSchema`
- **Imports:** `errors`, `types`
- **Used by:** `engine`, `index`

#### `standingFlags.ts`

The flags that are true of an SGO result regardless of the numbers.

- **Exports:** `standingFlags`
- **Imports:** `councilPolicy`, `deps`, `flags`, `referenceData`, `resolve`, `types`
- **Used by:** `regimes/kinshipZone`, `regimes/sgo`

#### `types.ts`

Domain types — spec §7. Vocabulary is defined in spec §3 and is not interchangeable.

- **Exports:** `AgeBand`, `BenefitTable`, `BreakdownStep`, `CalculatorInput`, `CalculatorResult`, `CapitalConfig`, `CarerInput`, `ChildInput`, `Citation`, `EnglandRegion`, `FinancesInput`, `Flag`, `FlagCode`, `FlagSeverity`, `FlatNationRates`, `FloorReason`, `IncomeSupportApplicableAmounts`, `IsoDate`, `KinshipZones`, `LaOverride`, `LawfulnessFlag`, `MeansTestBreakdown`, `MeansTestedBenefit`, `Nation`, `Pence`, `PerChildResult`, `RateTable`, `Regime`, `RegionalRates`, `TaperConfig`
- **Imports:** `money`
- **Used by:** `backdating`, `councilPolicy`, `dates`, `deps`, `engine`, `flagCatalogue`, `flagTypes`, `flags`, `guardrails`, `index`, `meansTest`, `rates`, `referenceData`, `regimes/kinshipZone`, `regimes/scotland`, `regimes/sgo`, `resolve`, `result`, `schema`, `standingFlags`

### 13.4 How the files connect

The same information as a single table, for when you want to see the shape
rather than one file at a time.

| File | Imports | Used by |
|---|---|---|
| `backdating.ts` | dates, deps, errors, money, rates, resolve, types | index |
| `councilPolicy.ts` | deps, errors, flags, meansTest, referenceData, types | engine, regimes/kinshipZone, regimes/sgo, standingFlags |
| `dates.ts` | errors, types | backdating, engine, guardrails, index, resolve |
| `deps.ts` | referenceData, types | backdating, councilPolicy, engine, rates, regimes/kinshipZone, regimes/scotland, regimes/sgo, standingFlags |
| `engine.ts` | councilPolicy, dates, deps, rates, regimes/kinshipZone, regimes/scotland, regimes/sgo, resolve, schema, types | index |
| `errors.ts` | (none) | backdating, councilPolicy, dates, guardrails, index, meansTest, money, rates, referenceData, regimes/sgo, schema |
| `featureFlags.ts` | (none) | index |
| `flagCatalogue.ts` | flagTypes, money, types | flags |
| `flagTypes.ts` | types | flagCatalogue, flags |
| `flags.ts` | flagCatalogue, flagTypes, referenceData, types | councilPolicy, index, regimes/kinshipZone, regimes/scotland, regimes/sgo, result, standingFlags |
| `guardrails.ts` | dates, errors, resolve, types | index, result |
| `index.ts` | backdating, dates, engine, errors, featureFlags, flags, guardrails, meansTest, money, referenceData, resolve, schema, types | (none) |
| `meansTest.ts` | errors, money, types | councilPolicy, index, regimes/sgo |
| `money.ts` | errors | backdating, flagCatalogue, index, meansTest, rates, regimes/kinshipZone, regimes/scotland, regimes/sgo, result, types |
| `rates.ts` | deps, errors, money, referenceData, resolve, types | backdating, engine, regimes/kinshipZone, regimes/scotland, regimes/sgo, result |
| `referenceData.ts` | errors, types | councilPolicy, deps, flags, index, rates, regimes/kinshipZone, regimes/sgo, result, standingFlags |
| `regimes/kinshipZone.ts` | councilPolicy, deps, flags, money, rates, referenceData, resolve, result, standingFlags, types | engine |
| `regimes/scotland.ts` | deps, flags, money, rates, resolve, result, types | engine |
| `regimes/sgo.ts` | councilPolicy, deps, errors, flags, meansTest, money, rates, referenceData, resolve, result, standingFlags, types | engine |
| `resolve.ts` | dates, types | backdating, engine, guardrails, index, rates, regimes/kinshipZone, regimes/scotland, regimes/sgo, standingFlags |
| `result.ts` | flags, guardrails, money, rates, referenceData, types | regimes/kinshipZone, regimes/scotland, regimes/sgo |
| `schema.ts` | errors, types | engine, index |
| `standingFlags.ts` | councilPolicy, deps, flags, referenceData, resolve, types | regimes/kinshipZone, regimes/sgo |
| `types.ts` | money | backdating, councilPolicy, dates, deps, engine, flagCatalogue, flagTypes, flags, guardrails, index, meansTest, rates, referenceData, regimes/kinshipZone, regimes/scotland, regimes/sgo, resolve, result, schema, standingFlags |

**Reading it.** `types.ts`, `errors.ts` and `money.ts` sit at the bottom, and
almost everything depends on them, so a change there reaches the whole engine.
Test it hard.

At the other end, `engine.ts` is used only by `index.ts`, and the three files in
`regimes/` only by `engine.ts`. Nothing else depends on them, so a new route for
a new nation or scheme goes there without disturbing anything underneath.

A file with a long **Used by** column is load-bearing. A file with an empty one
can be changed freely.

### 13.5 The letters


#### `index.ts`

@sgo/letters, spec §18.

- **Exports:** `GeneratedLetter`, `LETTER_TEMPLATES`, `LetterContext`, `LetterTemplate`, `TemplateSpec`, `generateLetter`, `letterAsPlainText`, `letterTitle`, `lettersRequiredFirst`, `suggestLetters`

#### `templates.ts`

The nine letters, spec §18.

- **Exports:** `LETTER_TEMPLATES`

#### `types.ts`

The shape of a letter and what it needs to fill itself in.

- **Exports:** `GeneratedLetter`, `LetterContext`, `LetterTemplate`, `TemplateSpec`

### 13.6 Where the website plugs in

The website never calculates. It collects answers, hands them to the engine, and
renders what comes back.

**`calculate()` is called in 1 place:**
- `apps/web/components/calculator/CalculatorShell.tsx`

Everything else reads the result. 28 files in `apps/web` import
from `@sgo/engine` or `@sgo/letters`:

- `apps/web/app/about/page.tsx`
- `apps/web/app/guidance/[slug]/page.tsx`
- `apps/web/app/rates/page.tsx`
- `apps/web/components/calculator/CalculatorShell.tsx`
- `apps/web/components/calculator/CouncilPicker.tsx`
- `apps/web/components/calculator/MoneyInput.tsx`
- `apps/web/components/calculator/formState.ts`
- `apps/web/components/calculator/steps/BenefitsStep.tsx`
- `apps/web/components/calculator/steps/CouncilStep.tsx`
- `apps/web/components/calculator/steps/WhereStep.tsx`
- `apps/web/components/flags/FlagCard.tsx`
- `apps/web/components/flags/FlagList.tsx`
- `apps/web/components/results/ArithmeticPanel.tsx`
- `apps/web/components/results/BackdatingPanel.tsx`
- `apps/web/components/results/EstimateCard.tsx`
- `apps/web/components/results/LettersPanel.tsx`
- `apps/web/components/results/MaximumHero.tsx`
- `apps/web/components/results/NextSteps.tsx`
- `apps/web/components/results/PerChildTable.tsx`
- `apps/web/components/results/PrintedInputs.tsx`
- `apps/web/components/results/ResultsPanel.tsx`
- `apps/web/components/ui/BenefitAmount.tsx`
- `apps/web/components/ui/RateTable.tsx`
- `apps/web/components/ui/RatesStaleBanner.tsx`
- `apps/web/components/ui/SourceLink.tsx`
- `apps/web/components/ui/mdxComponents.tsx`
- `apps/web/lib/jsonLd.tsx`
- `apps/web/lib/urlState.ts`

**The flow through the interface:**

```
steps/*.tsx  ──answers──▶  formState.ts  ──built input──▶  CalculatorShell.tsx
                                                                   │
                                                            calculate()
                                                                   │
                                                                   ▼
                                              ResultsPanel.tsx and the panels beside it
```

Add a question to the form and you touch `steps/`, `formState.ts` and the input
schema in `schema.ts`. Change what a result shows and you touch only
`components/results/`.

### 13.7 Where the numbers come from

Nothing in the engine contains a figure. Every rate, benefit amount and council
policy is read from `/data`.

```
/data/*.json  ──syncdata──▶  packages/engine/src/data/  ──imported by──▶  referenceData.ts
                                                                              │
                                                                     RATE_TABLES, BENEFIT_TABLES
                                                                              │
                                                                       selectRateTable()
```

`/data` is the only real copy. `packages/engine/src/data/` is generated and
gitignored, and `prebuild`, `pretypecheck` and `pretest:unit` all regenerate it.
Never edit it by hand, and never commit it.

To add a financial year: put the file in `/data`, then register it in
`referenceData.ts`, **newest first**. That is the whole change.

### 13.8 Every command

**The two that matter:**

```
pnpm verify          before you commit
pnpm verify:build    before you upload
```

| Command | What it does | When |
|---|---|---|
| `pnpm install` | Installs dependencies. Node 20+, pnpm 10 | First checkout, lockfile changes |
| `pnpm dev` | Local preview on localhost:3000 | While editing |
| `pnpm verify` | typecheck, unit tests, data gates, content, headers | Before every commit |
| `pnpm verify:build` | Build, then bundle budget and structured data | Before every upload |
| `pnpm build` | Static export into `apps/web/out` | Rarely alone |
| `pnpm typecheck` | TypeScript, no emit | Inside `verify` |
| `pnpm lint` | ESLint | By hand |
| `pnpm test:unit` | The engine and letters tests | Inside `verify` |
| `pnpm test:e2e` | Playwright, desktop and mobile | Before a release |
| `pnpm test:a11y` | The accessibility subset | Before a release |
| `pnpm validate:data` | Falling rates, mad values, missing sources | Inside `verify` |
| `pnpm check:staleness` | Rate expiry, council review dates, watchlist | Inside `verify` |
| `pnpm check:content` | A rate typed into prose, an em dash, an unanswered heading | Inside `verify` |
| `pnpm check:headers` | Security headers still in `.htaccess` | Inside `verify` |
| `pnpm check:schema` | Structured data references resolve | Inside `verify:build` |
| `pnpm check:bundle` | JavaScript size has not crept up | Inside `verify:build` |
| **`pnpm check:citations`** | **Opens every source URL, reports dead ones** | **Monthly, by hand** |
| `pnpm export:facts` | Regenerates this file | After any change to data or the engine |

**Working on the engine alone:**

```
cd packages/engine
pnpm test:unit       run the tests once
pnpm test:watch      re-run as you edit
pnpm test:coverage   with coverage
pnpm typecheck       types only
```

`syncdata` runs automatically before build, typecheck and test. You do not call
it yourself.

**Faking the date:**

```
SGO_TODAY=2027-04-12 pnpm check:staleness
```

Overrides today's date for `check:staleness` and `check:content`. Changes nothing
on the built site. Use it to rehearse next April.

### 13.9 The two things most likely to be got wrong

**The means test order.** The 20% disregard comes off income BEFORE expenditure
is subtracted. Inverting it roughly doubles the answer. Section 4 shows both
arithmetics side by side, and a property test exists solely to catch it.

**The rate table order.** `RATE_TABLES` in `referenceData.ts` must be newest
first, because `selectRateTable` takes the first table whose range contains the
date. Put a year in the wrong place and carers asking about an old order
silently get this year's rates.

### 13.10 How to know a change is safe

```
pnpm test:unit       the engine's own tests
pnpm verify          everything checkable without a build
pnpm verify:build    build, bundle budget, structured data
cd apps/web && npx playwright test
```

The guardrails in `guardrails.ts` are the real safety net. They run on every
result in production and throw rather than show a figure that breaks a rule. A
change that makes the calculator wrong in a way the tests miss will usually
still trip one of them.

If you are about to disable a guardrail to make something pass, the guardrail
is right and the change is wrong.

