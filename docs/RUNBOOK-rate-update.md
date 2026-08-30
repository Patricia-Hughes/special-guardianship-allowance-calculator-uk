# Runbook: the April rate update

**Owner:** _assign a named person. This is the single most important recurring
operation on this product, and "the team" is not an owner._

Rates change on **1 April**. Benefit rates change separately in the **first full
week of April**, around the 6th. They are two different jobs, in two different
pull requests, on two different dates. Treating them as one is the most likely
way to ship a silently wrong answer.

---

## Timeline

| When | Action |
|---|---|
| **Mid-January** | The DfE typically announces the NMA uplift. Watch gov.uk and The Fostering Network. Open the tracking issue. |
| **Late January** | Source the confirmed England table. Also chase the Welsh Government, the Scottish Government (SRA) and the NI trusts. |
| **February** | Create `data/rates.{FY}.json`. Populate all four nations. Set `effectiveFrom` to 1 April and `effectiveTo` to 31 March. |
| **February** | Run `pnpm validate:data`. The monotonic and uplift-sanity checks catch transcription errors before a human has to. |
| **March** | Open the PR. **Two-person review**: one checks the JSON against the source document line by line, the other checks the code. |
| **March** | Update `citations.json` retrieval dates. Update every `ratesFinancialYear` in MDX frontmatter. |
| **1 April** | Merge and deploy. Verify the live calculator returns the new figures. |
| **~6 April** | **Separate PR** for `benefits.{FY}.json` — Child Benefit, Guardian's Allowance, Carer's Allowance, UC, Income Support applicable amounts. Different date, different PR. |
| **Early April** | Post a "rates updated for FY XXXX/XX" note. Update the homepage `lastUpdated`. |

---

## Doing the rate update

1. Copy the previous year's file:

   ```
   cp data/rates.2026-27.json data/rates.2027-28.json
   ```

2. Edit the new file:
   - `financialYear`, `effectiveFrom` (1 April), `effectiveTo` (31 March)
   - `dataVersion` — bump it
   - every rate, **from the source document**, in integer pence
   - `upliftPercent` for each nation

3. Set the previous year's `effectiveTo` correctly if it is not already. The
   validator fails on a gap between years, because a gap means a date with no
   rates at all.

4. Run the gates:

   ```
   pnpm validate:data
   pnpm check:staleness
   pnpm test:unit
   ```

5. Update tests **T1** and **T2** in `packages/engine/src/__tests__/legal.test.ts`
   to the new expected figures. They are hardcoded on purpose: a rate change
   should have to be stated twice, once in the data and once in the test.

---

## Verification checklist — before merging a rate PR

- [ ] Every figure checked against the primary source **by a second person**
- [ ] All values are integer **pence**, not pounds
- [ ] `effectiveFrom` / `effectiveTo` correct and contiguous with the prior year
- [ ] Monotonic-by-age check passes for every region
- [ ] Uplift within the sanity band versus the prior year
- [ ] Previous year's file has a correct `effectiveTo`
- [ ] `dataVersion` bumped
- [ ] Tests T1 and T2 updated to the new expected figures and passing
- [ ] Staging shows the new figures for a known input
- [ ] `pnpm verify` green

---

## If the uplift is announced late

**Ship the old rates with the `RATES_STALE` banner. Do not guess, and never
interpolate.**

The banner appears automatically once the newest rate table's `effectiveTo` has
passed — it is rendered at build time from the data, so it works with JavaScript
disabled. `check-staleness` fails the build in the same situation, so you will
know.

A carer showing their council a figure you extrapolated is worse off than a
carer showing them last year's figure clearly labelled as last year's.

---

## The benefits update (~6 April)

Separate PR. `data/benefits.{FY}.json`, with `effectiveFrom` set to the actual
uprating date, **not** 1 April.

The benefit table is selected independently of the rate table. Between 1 and 6
April the calculator correctly uses new allowance rates with old benefit rates.
Test **T22** locks that behaviour in; if it starts failing after a benefits
update, the `effectiveFrom` is wrong.

`incomeSupportApplicableAmounts` is currently `PENDING_SOURCE` and blocks the
means-test route. Populating it from the DWP "Benefit and pension rates"
publication is what switches `MEANS_TEST_ENABLED` on. **Do not estimate these
figures** — every means-tested result shifts with them.

---

## Rollback

The static export is immutable per deploy. Roll back by redeploying the previous
build. There is no database and no migration, so a rollback is complete.

If a wrong rate reached production:

1. Roll back immediately. A wrong figure is worse than an old one.
2. Correct the data file and re-run the gates.
3. Note it on the corrections page — see the corrections policy in `/contact`.
