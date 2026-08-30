# What the calculator still can't answer

**Research brief — special guardianship allowance calculator**

> **Answered on 29 August 2026.** Most of this brief has been researched and the
> findings are built in. See `OPEN-ITEMS.md` for the current state. In short:
>
> - **Done** — Income Support amounts (both years, means test now live);
>   Kinship Zones confirmed; DfE guidance URL and paragraph 65 unchanged.
> - **Corrected** — Wiltshire moved to rest-of-England; three DWP benefit
>   figures fixed.
> - **Answered in the negative** — no DfE authority-level region list exists, so
>   the map now rests on ONS regions and says so on screen.
> - **Shipping with a caveat** — the Welsh band inversion is real, corroborated
>   across two years, so Wales is live with an on-screen explanation.
> - **Still open** — the 2024/25 rate table (try the National Archives
>   snapshot), Devon and Leeds policy URLs, more councils for the taper, and the
>   LGSCO decisions at citable URLs.
>
> The brief is kept below as the specification of what was asked for.

Nine things we need sourced before features that are built but switched off can
go live. Each one is a lookup in a published document — none of them needs a
judgement call.

---

> **The one rule that governs all of this:** if a figure isn't in a published
> source we can cite, it doesn't go in the product. Don't derive, estimate,
> average or "correct" anything. A missing number shows as missing; a wrong
> number costs a carer money they were owed. Send back what the document says,
> even if it looks wrong — especially if it looks wrong.

---

## Priority order

Ordered by how much is stuck behind each one, not by how hard they are to find.

| # | What we need | Status | What it unblocks |
|---|---|---|---|
| 1 | Wiltshire's region under the DfE definition | **Wrong answers now** | Correct amounts for a live Kinship Zone |
| 2 | Welsh rates, direct from Welsh Government | **Wales is off** | The entire Wales route |
| 3 | Public policy URLs for three councils | Held back | Council-specific pages |
| 4 | DWP Income Support applicable amounts | Held back | The means-test protection floor |
| 5 | 2024/25 rate tables as published | Held back | Backdating an underpayment |
| 6 | How councils actually taper against income | Assumed | Means-test accuracy |
| 7 | The full DfE region list, all 153 authorities | Unverified | Accuracy everywhere else |
| 8 | Current DfE guidance URL and paragraph 65 | May have moved | Every legal citation |
| 9 | Kinship Zones list at launch | Routine check | The Kinship Zone path |

---

## The detail

For each: the question, where the answer lives, and what to send back.

---

### 1. Is Wiltshire in the South East?

**Status: wrong answers now**

This is the only item where the calculator may be giving people a wrong number
*today*. Two official sources disagree, and we followed the one the spec named.

**The question**

In the DfE's own regional definition for the National Minimum Allowance, which
band does **Wiltshire** sit in — South East, or the rest-of-England band?

**Why it matters**

The two bands pay differently for the same child:

| Age band | South East | Rest of England | Gap |
|---|---|---|---|
| 0–2 | £195.00 | £176.00 | £19 |
| 5–10 | £223.00 | £201.00 | £22 |
| 16–17 | £298.00 | £267.00 | £31 |

So £19 to £31 a week per child, depending on age. Wiltshire is also a Kinship
Zone, so it gets more traffic than an average council.

**Where to look**

The DfE statutory guidance or the National Minimum Allowance annex that *lists
which authorities fall in the South East band for allowance purposes*.

**Do not use the ONS standard region list.** That is the source of the
conflict: ONS puts Wiltshire in the South West, while the spec we were given
maps it to the South East. We need the DfE's allowance-specific definition,
which may not match ONS at all.

**Send back**

Document title, publisher, publication date, URL, and the exact list or wording
showing which band Wiltshire falls in. A screenshot of the relevant table is
ideal.

*Lands in `data/la-region-map.json` — currently mapped `south-east` with a
recorded discrepancy.*

---

### 2. The Welsh rates, from the Welsh Government original

**Status: Wales is off**

No carer in Wales can use the calculator at all right now. One figure looks
wrong, and we refused to guess which way.

**The question**

What are the Welsh National Minimum Allowance weekly rates for **2026/27**, for
each age band, as published by the Welsh Government?

**The problem with what we have**

Our secondary source says:

| Age band | Weekly rate | |
|---|---|---|
| 0–4 | £229.00 | |
| 5–15 | £208.00 | ← lower than the younger band |
| 16–17 | £260.00 | |

Allowances don't fall as a child gets older — every other rate table we hold
rises with age. A 5-year-old costing less than a 4-year-old is almost certainly
a transcription error somewhere between the Welsh Government and the site we
read it from. But it might not be, and we can't tell from here.

**Where to look**

The Welsh Government's own circular, written statement or guidance setting the
Welsh NMA. Welsh-language originals are fine — send the Welsh and we'll handle
it.

**Send back**

Every age band and its weekly rate exactly as printed, plus the URL and date. If
the published table really does show 5–15 below 0–4, tell us that — we'll ship
it as published and note it, rather than silently "fixing" it.

*Lands in `data/rates.2026-27.json` → `wales`. Turns on the Wales route.*

---

### 3. Citable policy pages for Devon, Leeds and North Tyneside

**Status: held back**

We hold policy detail for these three councils but publish none of it. Naming a
council publicly and saying what it pays needs a live source we can link to.

**The question**

For **Devon**, **Leeds** and **North Tyneside**: where is each council's current
special guardianship allowance policy published?

**Where to look**

The council's own website — usually under children's services, fostering, or a
published policy library. A PDF is fine as long as the URL is stable and public.
Freedom-of-information responses hosted on WhatDoTheyKnow also work if nothing
else exists.

**Send back, per council**

- Direct URL to the policy, and its publication or last-review date
- Does it means test, and against what?
- Does it deduct Child Benefit from the allowance?
- Does it pay a fixed percentage of the fostering rate — and if so, what percentage?
- Does it apply the regulation 7 protected minimum?

*Lands in `data/la-overrides.json` — all three sit at `publishable: false` until
a URL exists.*

---

### 4. DWP Income Support applicable amounts

**Status: held back**

The means test has a floor: a family should keep at least 125% of basic living
costs. We can't compute that without the underlying figures, so that protection
is currently inactive.

**The question**

What are the Income Support **applicable amounts** — personal allowances and
premiums — for **2025/26** and **2026/27**?

**Where to look**

DWP's published benefit and pension rates tables for each year, or the Social
Security Benefits Up-rating Order that sets them. The annual "Benefit and
pension rates" document is the usual home.

**Send back**

The personal allowance figures by claimant type (single, couple, by age) and the
premium figures, for both years, with the source URL and date for each year. We
need both years because the calculator can answer for either.

*Lands in `data/benefits.2025-26.json` and `data/benefits.2026-27.json`.*

---

### 5. The 2024/25 rate tables, as actually published

**Status: held back**

Someone underpaid in 2024/25 can ask for the difference back. Without the real
table we can't tell them what they were owed.

**The question**

The full **2024/25** National Minimum Allowance table for England: every age
band, every region.

**The trap**

**Do not work backwards from an uplift percentage.** Taking the 2025/26 figures
and removing the uplift gets close, and close is wrong — rounding at each band
means a derived figure can be a pound or two out, and a pound a week over a year
is real money in a backdating claim. We need the table as it was printed at the
time.

**Where to look**

The DfE announcement or guidance for the 2024/25 year. Archived copies via the
National Archives web archive are perfectly acceptable if the original has been
replaced.

**Send back**

The complete table with the source URL and date. Partial tables aren't much use
— a missing band means that age can't be backdated.

*Lands in `data/rates.2024-25.json`. Turns on backdating.*

---

### 6. How councils really taper against income

**Status: assumed**

The means test currently uses an assumed method and tells the user so.
Confirming it — or discovering councils disagree — decides whether we can drop
that warning.

**The question**

Across **five to ten** published council policies, how is the allowance reduced
as household income rises? Same method everywhere, or does it vary?

**Where to look**

Any councils with a public SGO allowance policy — the three in item 3 count
toward the total. Look for the section describing the financial assessment or
means test.

**Send back**

For each council: the taper as the policy describes it, in the policy's own
words, plus the URL. If they diverge, that's a useful answer, not a failed
search — we'd then make it configurable per council and say so on screen. What
we must not do is invent a single national figure.

*Lands in the means-test engine; clears the `TAPER_METHOD_ASSUMED` warning.*

---

### 7. The full DfE region list, all 153 authorities

**Status: unverified**

Item 1 is this problem for one county. This is the same check for the other 152,
and it's the durable fix.

**The question**

Which of London, South East and rest-of-England does the DfE assign to **each**
English children's services authority, for allowance purposes?

**A known wrinkle**

The spec asks for "all 152" authorities; the actual upper-tier list comes to
**153** — 33 London boroughs including the City of London, 36 metropolitan
districts, 21 counties and 63 unitaries including the Isles of Scilly. The Isles
of Scilly is often dropped from local-authority statistics, which probably
explains the difference. We map all 153 so nobody is unmapped. Worth confirming
which count the DfE itself uses.

**Send back**

The authority-to-region list as the DfE publishes it, in whatever form you find
it, with the URL and date. A spreadsheet or a table in a PDF are both fine.

*Rebuilds `data/la-region-map.json` from a verified source.*

---

### 8. The current DfE guidance URL, and where paragraph 65 went

**Status: may have moved**

Every legal citation on the site points at this guidance. If a Summer 2026
update renumbered it, our references quietly stop landing on the right
paragraph.

**The question**

- What is the current, live URL for the DfE special guardianship statutory guidance?
- Has the Summer 2026 update been published?
- If so, does **paragraph 65** still say what it said — and is it still numbered 65?

**Send back**

The live URL, the version date, and the current text and number of the paragraph
dealing with the allowance. If it moved, we need both the old and new numbers so
the change is traceable.

*Lands in `data/citations.json`.*

---

### 9. Kinship Zones at launch

**Status: routine check**

A short confirmation rather than a research task, but it needs redoing every
three months, so it's worth knowing who owns it.

**The question**

Which areas are Kinship Zones as at launch, and is the list we hold still
current?

**Send back**

The current list with its source and the date you checked. We stamp that date in
the data and the site re-flags it for review after three months.

*Lands in `data/kinship-zones.json` → `lastVerified`.*

---

## Two things that aren't research

Both are blocked, but neither is answered by finding a document.

### 10. Legal review of the warning wording

The calculator can tell a carer that their council may be deducting Child
Benefit unlawfully. That is a strong claim to put in front of someone, and the
wording needs a solicitor's eye before it goes live — not a researcher's. The
council-specific page template needs the same review.

*Wording lives in the engine's flag definitions. Needs a name against it.*

### 11. Whether analytics ships at all

Currently nothing is tracked and the privacy notice says so. The site processes
details about people's children and their finances entirely inside the browser;
adding analytics changes what that notice has to say. This is your call, not a
lookup. The default, and our recommendation, is no.

*Not implemented. Leaving it that way needs no work.*

---

## How to send it back

For every item, the same five things: **source title**, **publisher**,
**publication or last-review date**, **URL**, and **the figures or wording
exactly as printed**.

Raw is better than tidy. Don't round, don't convert, don't summarise a table
into prose, and don't reconcile two sources that disagree — send both and say
they disagree. A screenshot alongside the numbers costs nothing and settles most
questions.

Partial answers are genuinely useful. Item 2 alone switches Wales on; item 1
alone corrects a live figure. Nothing here needs to arrive as a set.
