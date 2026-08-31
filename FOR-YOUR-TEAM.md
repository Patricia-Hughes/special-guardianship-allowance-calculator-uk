# What I need from your team

Updated 31 August 2026.

The calculator is finished and works. This is the short list of things that
still need a person rather than a computer. There are three jobs. Only the
first one is urgent.

| Job | Who does it | How long | Status |
|---|---|---|---|
| A. Read the wording and check it is legally safe | A solicitor who works in children's social care | Half a day to a day | **Outstanding. The only thing left.** |
| B. Find four missing sources | A researcher | A few hours | Done, 31 August 2026 |
| C. Decide one thing about privacy | You | Five minutes | Done, 31 August 2026: no analytics |

## The order, as agreed on 31 August 2026

1. Content brief written
2. All the copy rewritten
3. **Solicitor reviews the rewritten copy (Job A)**
4. Fixes applied
5. Publish

So Job A does not start yet. It waits for the rewrite, which means the review
happens once, on the words that will actually be published. Appendix 1 below
still lists the five warnings that need the closest reading, because they are
the ones the writer should be briefed on hardest and the ones the solicitor
should spend the most time on when the rewrite reaches them.

---

# Job A. A solicitor reads the wording

## Why

Every fact on the site is sourced. Each number and each legal point traces
back to a published document, and an automated check refuses to build the site
if a source reference is broken or missing from our sources list.

What has never happened is a qualified person reading the actual sentences.

The difference matters because carers take these sentences into meetings with
their council. If we have written "your council cannot" where the law only
supports "your council should not", we have handed a carer a weaker position
while making them feel they have a stronger one. That is the risk we want
closed.

## What to review

There are three groups, in order of risk.

### 1. The five warning messages that make a legal claim (highest risk)

These appear automatically on a carer's result page when their answers match
certain conditions. The full current wording is in Appendix 1 below. They are:

1. Taking Child Benefit off your allowance may not be lawful in your case
2. A fixed percentage of the fostering rate has been ruled unlawful
3. This rate is below the national minimum for fostering
4. The Ombudsman has made a finding about this council
5. Check what your council is tapering

### 2. The eight letter templates (high risk)

Carers copy these, put their own details in, and send them to their council.
They are listed in Appendix 2. The full text can be seen on the live site, or
we can export them to a document if that is easier.

### 3. The sixteen guidance pages (lower risk, but worth a skim)

About 7,100 words in total. Listed in Appendix 3. These explain the law rather
than making demands of a council, so the risk is lower, but the same wording
question applies.

## The questions we want answered

For each item, we are asking:

1. **Is the legal claim accurate?** Not "is it roughly right" but "would this
   survive a council's legal team reading it".
2. **Is the strength of the language justified by the source?** This is the
   main question. The strength of a word here is a legal decision, not a style
   decision: a carer reads "cannot" and "should not" as different rights, and
   acts on the difference in a meeting with their council. Watch for must
   versus should, cannot versus should not versus does not have to, unlawful
   versus not appropriate versus a departure from the guidance, and "the courts
   have held" versus "the Ombudsman found in one case".
3. **Does anything read as an accusation against a named council?** Our house
   rule is that the site never states a council has broken the law. It states
   what the guidance says and what a published decision found, and lets the
   reader draw their own conclusion. Please flag anywhere we have drifted over
   that line.
4. **Is anything missing that a carer would be misled by not knowing?** For
   example a time limit, or the fact that a decision about one council does not
   automatically apply to another.
5. **Is the reading level right?** We are writing for people aged roughly 55 to
   75, at a reading age of 12 to 14, often at a stressful moment. Please do not
   make it more lawyerly than it has to be. Where precision requires a longer
   sentence, say so and we will take the longer sentence.

We do not need redrafted copy back, though it is welcome. Marked up comments
are enough.

## What we will do with the answer

Fix everything flagged, then publish. If the solicitor wants a second look
after changes, we will arrange that.

---

# Job B. Done, 31 August 2026

Your researcher answered all four. Everything usable is in the calculator, and
the two things that could not be sourced are recorded rather than guessed.

| Item | Outcome |
|---|---|
| B1. Older rates for the other nations | **Scotland is in.** The allowance was frozen for 2024/25, so the August 2023 rates stood, and Scottish backdating now covers that year. Northern Ireland is **not** in: the figures could not be read from the primary document, and when the announced uplifts are applied, three of the four reproduce the current table exactly and one does not. A one-pound discrepancy is not something to ship. Wales could not be sourced at all. |
| B2. The Welsh circular | **The publication route is now known**, which was the real blocker. Welsh rates go out as bilingual Care Inspectorate Wales bulletins, and the 2023/24 one is confirmed. The years we want are not, and the rate table inside is an image, so retrieving them needs a person rather than a script. |
| B3. Devon and Leeds | **Both are now in use.** Devon brought a real find with it: its policy allows basic living costs at 100% of the Income Support rate where the standard model allows 125%, which makes a Devon carer's assessed contribution larger and their allowance smaller. The calculator now applies Devon's own figure and tells the carer why theirs differs. Leeds is in use with its policy under review said plainly on the result, and with no Child Benefit claim attached, because the only source for that was a superseded freedom of information response. |
| B4. The four Ombudsman decisions | **All four found, and three of them corrected what we held.** North Tyneside's report is from 2018, not 2019. Southend's reference and date were both wrong. The Rochdale entry was linking to a Shropshire council document by mistake. And the Rochdale decision survived a High Court challenge, which is what makes it safe to rely on at all. |

**The most important thing your researcher found was not on the list.** A second
Devon decision, from later in 2024, was **not upheld**: the Ombudsman found
Devon's current practice consistent with government guidance. Without that, the
site would have gone on describing a council by a policy it had already
changed. Chasing it down was the difference between accurate and defamatory, and
it prompted us to find the same error elsewhere in our own code. Please pass
that on.

**Two short lookups are left**, both now on an automatic reminder rather than a
list somebody has to remember to read:

1. Open the Northern Ireland model scheme PDF in a browser and read the four
   figures out of it. The server blocks automated access, so it needs a person.
   Five minutes.
2. Find the Care Inspectorate Wales bulletins for 2024/25 and 2026/27. The
   2023/24 address gives the pattern.

Neither blocks anything. Both are worth doing when somebody has a spare morning.

# Job C. Decided, 31 August 2026

**Should the website measure anything about its visitors? No.**

Nothing counts a visit, nothing follows anybody between pages, and nothing is
sent anywhere when the calculator is used. There are no cookies and no banner,
because there is nothing to consent to.

That decision is now enforced rather than merely intended: the privacy notice
says it in plain words, and an automatic check fails the build if tracking code
is ever added. If it is ever changed, it has to be changed on purpose, in the
same commit as the privacy notice.

# Appendix 1. The exact wording of the five warning messages

Text in `**bold**` is bold on the page. Text in curly brackets is filled in
automatically with the carer's own details.

## A1.1 "Taking Child Benefit off your allowance may not be lawful in your case"

> You have told us you get a means-tested benefit **and** that your council
> takes Child Benefit off your allowance.
>
> In 2024 the Local Government and Social Care Ombudsman found that taking
> Child Benefit off carers who are on means-tested benefits, as a blanket rule,
> was wrong. The council involved had to recalculate around 170 carers'
> allowances and pay refunds.
>
> Ask your council in writing to confirm whether it takes Child Benefit into
> account for carers on means-tested benefits, and to explain how it decided
> that in your case.

Source relied on: LGSCO decision, Devon County Council (2024).

## A1.2 "A fixed percentage of the fostering rate has been ruled unlawful"

> {Council name}'s published policy appears to set the allowance at a fixed
> share of the fostering rate.
>
> The courts have repeatedly held that applying a flat percentage, two-thirds,
> or a third, or any other fixed fraction, is an unjustified departure from the
> guidance. The starting point is the core fostering allowance, and the council
> must consider your actual circumstances.
>
> Ask for the written policy and for the reasons behind the figure you were
> given.

Sources relied on: Barrett v Kirklees MBC [2010] EWHC 467 (Admin), and
R (TT) v Merton LBC [2012] EWHC 2055 (Admin).

**Note the heading says "has been ruled unlawful".** This is the sentence I am
least comfortable with and would most like checked.

## A1.3 "This rate is below the national minimum for fostering"

> The rate we hold for {council} ({amount} a week) is below the national
> minimum fostering allowance for the {age band} age band in your area
> ({amount} a week).
>
> The statutory guidance says the core fostering allowance is the starting
> point for a special guardianship allowance. A figure below it needs an
> explanation.
>
> Ask the council to explain in writing how it arrived at the figure and how it
> compares with what it pays its foster carers.

Source relied on: DfE Special Guardianship Guidance (Jan 2017), para 65.

## A1.4 "The Ombudsman has made a finding about this council"

> {Summary of the specific decision, or: The Local Government and Social Care
> Ombudsman has published a decision about this council's special guardianship
> allowance practice.}
>
> A published decision about one carer does not automatically apply to you, but
> it is relevant background if you are asking the council to look at your case
> again.

## A1.5 "Check what your council is tapering"

> Regulation 7 protects the **reward** part of a former foster carer's
> allowance for two years. It does not authorise tapering the whole allowance.
>
> The Ombudsman found in 2020 that reducing an entire allowance to 75% and then
> 50% misapplied that rule. If your payments are being stepped down, ask the
> council which element it is reducing and why.

Source relied on: LGSCO decision, Southend-on-Sea (Dec 2020).

---

# Appendix 2. The eight letter templates

These are what a carer sends to their council. Each one fills in the carer's
own details automatically.

1. Ask about Child Benefit being taken off your allowance
2. Ask how your allowance was calculated, where a percentage seems to have been used
3. Ask for your two-year former foster carer protection to continue
4. Ask for more because of your child's needs
5. Ask for your council's written policy
6. Ask for the arithmetic behind your figure
7. Ask for your annual review
8. Make a stage 1 complaint

For the solicitor: the specific question on these is whether a carer sending
one could be put in a worse position than if they had said nothing, and whether
anything in them commits the carer to a position they may not want to hold.

---

# Appendix 3. The sixteen guidance pages

| Page | Words |
|---|---|
| Annual reviews | 306 |
| Asking for the policy | 389 |
| Benefits and your allowance | 448 |
| Child Benefit deduction | 560 |
| Complaining to the Ombudsman | 446 |
| Enhancements for additional needs | 412 |
| Fixed percentage policies | 433 |
| Former foster carers | 527 |
| How the means test works | 760 |
| Kinship Zones | 403 |
| Rates | 478 |
| Scotland kinship care | 390 |
| Turning 18 | 305 |
| What your council must consider | 525 |
| Which council is responsible | 301 |
| Who can get an allowance | 400 |
| **Total** | **7,083** |

---

# What is not on this list

For the avoidance of doubt, the following are done and need nothing from
anybody:

- All the allowance rates for the current year, all four nations
- Backdating for England, and for Scotland back to 2024/25
- The means test, including the benefit figures behind it, and per-council
  variations where a council publishes one
- The mapping of all 153 English councils to their region
- A council picker covering all 153 English authorities, and for six of them the
  published policy detail, each with a current and citable source
- Accessibility, tested automatically against WCAG 2.2 AA
- No analytics, enforced by a build check rather than by good intentions
- Security headers, page speed, and the whole calculator working end to end,
  all checked automatically on every change: 150 unit tests and 188 browser
  tests, plus ten data and content gates
