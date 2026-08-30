# Open items

From spec §42. Each must close before the feature it blocks ships. Nothing here
may be closed by deriving, estimating or "correcting" a figure.

**Standing rule:** if a figure or legal point is not in the spec or in `/data`,
it does not go in the product. Flag it, open an issue, ship without it.

| # | Item | Blocks | Where it is tracked in the code | Owner |
|---|---|---|---|---|
| 1 | Source 2024/25 rate tables directly. **Do not derive from uplift percentages.** | Backdating | `data/rates.2024-25.json` → `status: PENDING_SOURCE` | |
| 2 | Verify the Welsh 0–4 vs 5–15 inversion against the Welsh Government original. Likely a transcription error in secondary sources. | Wales route | `data/rates.2026-27.json` → `wales.verify: true`; `validate-data` gate 12 | |
| 3 | Source DWP Income Support applicable amounts for the 125% core living-cost calculation. | Means test | `data/benefits.*.json` → `incomeSupportApplicableAmounts.status` | |
| 4 | Confirm the DfE taper method across 5–10 published LA policies. If they diverge, ship configurable with explicit disclosure. Do not invent a national figure. | Means test accuracy | `meansTest.ts` `DEFAULT_TAPER`; `TAPER_METHOD_ASSUMED` flag | |
| 5 | Re-source every LA override and citation URL. Naming a council publicly requires a current citable source. | LA pages | `data/la-overrides.json` → `publishable: false` on every entry | |
| 6 | Legal review of the `UNLAWFUL_CB_DEDUCTION_RISK` and `FIXED_PERCENTAGE_POLICY` flag copy, and of the `/la/` page template. | LA pages, flags | `packages/engine/src/flags.ts` | |
| 7 | Confirm Kinship Zones status at launch date. | Kinship Zone path | `data/kinship-zones.json` → `lastVerified`, reviewed every 3 months | |
| 8 | Rebuild `la-region-map.json` from the DfE NMA regional definition, not a generic ONS lookup. | Region accuracy | `data/la-region-map.json` → `verificationStatus`, `knownDiscrepancies` | |
| 9 | Confirm the DfE statutory guidance URL and whether the Summer 2026 update has landed. Para 65 may have moved. | All citations | `data/citations.json` → entries with `pendingSourceIssue` | |
| 10 | Decide whether analytics ships at all. Default is no. | Launch | Not implemented — see the privacy notice | |

---

## Two flagged in the data, worth reading before item 8 is closed

**Wiltshire is mapped to `south-east`.** The spec's §8.8 example maps it there
and describes it as being in the South East region; the ONS standard region for
Wiltshire is the **South West**. The spec itself singles Wiltshire out for
verification. It is mapped per the spec pending confirmation against the DfE's
own regional definition. A wrong region here changes the answer by £19 to £31 a
week depending on the child's age — the gap between the South East and
rest-of-England columns of the 2026/27 table, widest at the 16–17 band — and
Wiltshire is also a Kinship Zone, so it gets traffic.

**The authority count is 153, not 152.** §9 gate 6 asks for coverage of "all 152
English children's services authorities". The full upper-tier list — 33 London
authorities including the City of London, 36 metropolitan districts, 21 counties
and 63 unitaries including the Isles of Scilly — is 153. The Isles of Scilly is
frequently excluded from local authority statistics, which is the likely source
of the difference. All 153 are mapped so that no carer is unmapped, and
`expectedAuthorityCount` records what actually ships; CI fails if the two drift
apart.

Both are recorded in `data/la-region-map.json` under `knownDiscrepancies`.
