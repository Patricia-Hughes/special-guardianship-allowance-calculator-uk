# Brief needed: full rewrite of the SGO allowance site copy

For the content brief team. Updated 31 August 2026.

---

## What we are asking for

We need a **content brief** written for a copywriter who will rewrite all the
words on our special guardianship allowance site. About 7,100 words across
sixteen guidance pages, plus the homepage, plus the words inside the calculator
itself.

We are not asking you to write the copy. We are asking you to write the brief
that tells a copywriter how to write it.

## The situation, stated honestly

The site's **structure** was specified properly. Which guidance pages exist,
what each one covers, how the calculator's warnings link through to them: all
of that was set out in the original specification.

What was never specified is the **actual wording**. The developer wrote the
sentences, working from cited government and local authority sources. Every
legal claim on the site traces to a real published document, and the build
fails automatically if a source reference is broken or missing.

So: **the facts are checked. The sentences are not.** No solicitor has read the
phrasing. That is the gap we are closing, and it is why this rewrite is
happening at all.

---

## The single most important thing in this brief

**The strength of a word is a legal decision, not a style decision.**

This is the point the brief must hammer, because a normal copywriter will not
expect it. On most websites, picking between "cannot" and "should not" is a
matter of tone. On this site it changes what a reader believes their rights
are, and they will act on that belief in a meeting with their council.

Two real examples from the current site.

**Example one.** A warning that appears on a carer's result page says:

> In 2024 the Local Government and Social Care Ombudsman found that taking
> Child Benefit off carers who are on means-tested benefits, as a blanket rule,
> **was wrong**.

The fact is proven and sourced. But "was wrong" is a choice. "Was not
appropriate" is weaker. "Was unlawful" is stronger. The three send a carer into
a very different conversation with their council.

**Example two.** A heading currently reads:

> A fixed percentage of the fostering rate **has been ruled unlawful**

That is a heavy phrase resting on case law. If the case law is narrower than
the heading implies, we have handed a carer an overstatement and set them up to
be corrected by a council's legal team. Being corrected in that meeting does
not just lose them the point. It costs them their confidence for the rest of
the conversation.

**So the brief must instruct the writer to:**

1. **Never strengthen a claim for readability or impact.** If the source says
   "should", the copy says "should". Making it land harder is not the writer's
   call.
2. **Flag every word choice that carries legal weight** in a separate column or
   comment, rather than quietly picking one. We want to see the decisions, not
   inherit them.
3. **Treat this list as a watchlist:** must / should / may, cannot / should not
   / does not have to, unlawful / not appropriate / a departure from the
   guidance, the courts have held / the Ombudsman found in one case, will / is
   likely to / may.
4. **Never write a sentence that implies a named council has broken the law.**
   The site states what the guidance requires and what a published decision
   found, and lets the reader draw the conclusion. This is a hard rule, not a
   preference.
5. **Distinguish a general rule from a single decision.** An Ombudsman finding
   about one council does not automatically apply to another, and the copy must
   never blur that.
6. **Not add a claim we cannot cite.** If the writer believes something is true
   and we have no source for it, it goes on a query list and stays out of the
   copy until we find one.

If the brief gets nothing else across, get this across.

---

## The rest of the brief

### Audience

- Grandparents and other family carers. Mostly aged 55 to 75.
- Often reading at a stressful moment, sometimes after being given wrong
  information by their council already.
- Target reading age 12 to 14. Short sentences. No legal jargon without a plain
  explanation beside it.
- Many will be on a phone.

Where precision needs a longer sentence, take the longer sentence. Accuracy
beats brevity every time on this site.

### Tone

- British English throughout.
- Plain, calm, factual. Not chirpy, not corporate, not frightening.
- **No em dashes anywhere.** There is an automated check that fails the build if
  one appears. Use commas, full stops or brackets.
- Do not tell the reader what to feel. Tell them what is true and what they can
  do next.

### Money figures

The copy must **not** contain any written out amounts. Rates are pulled live
from our data and rendered automatically, so a hardcoded figure would go stale
and the build check would reject it. The writer marks where a figure belongs
and we insert the component.

### What each page must come with

Every guidance page carries a small header block that the writer fills in, not
just the body text:

- Title
- URL slug
- One line description
- Last updated date
- Last reviewed date
- How often it needs reviewing
- The list of source IDs the page relies on

Some pages also carry a related letter template and a set of frequently asked
questions.

### Scope

1. Sixteen guidance pages, about 7,100 words. Longest is 760 words, shortest is
   301.
2. The homepage.
3. The words inside the calculator: the warning messages shown on a result, and
   the eight letter templates carers send to their council.

**Items 3 are the highest risk and should be briefed first and reviewed
hardest.** Those are the words that leave our site and land on a council desk.

### What the writer needs from us

- The existing copy.
- The sources file, so they can see what each claim rests on.
- A marked list of which pages and which sentences are highest risk.

We can supply all three.

---

## Sequencing, which matters

We also have a solicitor review outstanding on the current wording. Please
assume the order is:

1. Content brief written (you)
2. Copy rewritten (the writer)
3. **Solicitor reviews the rewritten copy**
4. Fixes applied, then publish

Reviewing the old copy and then rewriting it would waste the review. The brief
should therefore state plainly that the writer's output goes to a solicitor
with children's social care experience before anything is published, and that
the writer should expect and plan for a round of legal amends.

Please build that step into the brief and the timeline rather than treating it
as optional.
