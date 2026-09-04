import type { Metadata } from 'next';
import { allContent } from '../../lib/content';
import { LA_REGION_MAP } from '@sgo/engine';
import { AUTHOR_NAME } from '../../lib/jsonLd';

export const metadata: Metadata = {
  title: 'About this site and how I source it',
  description: 'Who writes this, where the figures come from, how often it is reviewed, and what I deliberately do not publish.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  const guides = allContent('guidance');
  return (
    <>
      <h1>About this site</h1>

      <p className="lede">
        My name is {AUTHOR_NAME}. In 2024 I became a special guardian for my granddaughter, after
        she had been living with me as a kinship foster child.
      </p>

      <h2>Why I built this</h2>

      <p>
        Because I could not check my own allowance, and nobody would show me how it had been worked
        out.
      </p>

      <p>
        She had been with me for some time before the Special Guardianship Order was made. By then
        we had a routine. School, meals, homework, appointments, and all the ordinary things that
        come with raising a child.
      </p>

      <p>
        The order changed the legal arrangement. I did not expect it to change something as
        important as the money without anyone explaining why.
      </p>

      <p>At one meeting I was told what my new allowance would be.</p>

      {/*
        Literal money, deliberately, and the only two figures on this site that are.
        £127 and £226 are a personal record from 2024, not rates: they describe one
        decision that has already been made and will never uprate. The money gate in
        check-content.ts exists for the opposite case, a live rate typed into prose
        that goes silently wrong every April. If that gate is ever widened to cover
        .tsx pages, these are the lines it needs to allow.
      */}
      <p className="story-figure">£127 a week.</p>

      <p>I wrote it down.</p>

      <p>Then I asked how they had arrived at it.</p>

      <p>
        Before the order I had been receiving <strong>£226 a week</strong> as a kinship foster
        carer, which included a skills payment. After the order that became £127.
      </p>

      <p>Nobody explained the difference to me in the meeting.</p>

      <h3>What I went looking for</h3>

      <p>
        A national table of special guardianship rates. There is not one, and I looked for a long
        time before I accepted that.
      </p>

      <p>
        I went home and started going through the paperwork from when I was fostering her. The
        national fostering rates were easy enough to find. So was the guidance about special
        guardianship allowances.
      </p>

      <p>But a fostering rate is not a special guardianship rate.</p>

      <p>
        Nothing said that a special guardian caring for a child of a certain age should receive a
        set amount each week. I had assumed something would. The rates{' '}
        <a href="/rates">published on this site</a> are fostering rates, and that is why.
      </p>

      <p>Then I found the thing I had missed.</p>

      <p>
        There is a rule about the reward element of a fostering allowance continuing for a period
        after a Special Guardianship Order, depending on what was decided before the order was made.
        It is regulation 7, and I have set out{' '}
        <a href="/guidance/former-foster-carers">what it does and does not say</a>. I went back
        through my old fostering paperwork to see whether a decision about that had been made in my
        case.
      </p>

      <p>I could not find a clear answer.</p>

      <p>That was the part that bothered me most.</p>

      <p>
        I had been asking the wrong question. I was hunting for a national special guardianship rate
        when what I needed to understand was <strong>what had happened to my own fostering
        allowance</strong> on the day the order was made.
      </p>

      <p>
        My allowance was also{' '}
        <a href="/guidance/how-the-means-test-works">means tested</a>. I was receiving Universal
        Credit at the time, and{' '}
        <a href="/guidance/child-benefit-deduction">Child Benefit had been deducted</a> from the
        calculation.
      </p>

      <p>That explained part of the £127.</p>

      <p>It did not explain everything.</p>

      <h3>What happened when I asked</h3>

      <p>Four months later I was sent the policy I had already read.</p>

      <p>
        I asked the council to review the calculation. At one point I was told to speak to the
        social worker. The social worker sent me back to the finance team.
      </p>

      <p>
        I also had to work out for myself that the council responsible was{' '}
        <a href="/guidance/which-council-is-responsible">the one looking after my granddaughter</a>,
        and not the one where I live.
      </p>

      <p>The letter, when it came, said they were satisfied that the allowance was correct.</p>

      <p>Nothing changed for me.</p>

      <p>
        I have never been told that my figure was wrong. What I could not do was check it for
        myself.
      </p>

      <p>
        My experience is not an answer for anybody else, either. A different set of circumstances
        produces a different allowance, and that is one reason I wanted to be precise about what can
        be checked and what cannot.
      </p>

      <h3>So I made a table</h3>

      <p>
        The rates went in one column, the dates in another, and beside each figure I wrote down
        where I had found it.
      </p>

      <p>
        Where I could verify something, I recorded the source. Where I could not, I left the space
        blank. Until then what I had was a pile of separate pieces: the fostering rates were
        published, the statutory guidance was published, my council had its own policy, and none of
        them together let me reproduce the calculation that turned my circumstances into £127.
      </p>

      <p>The table separated two questions.</p>

      <p>What does the published guidance say?</p>

      <p>And how did my council arrive at my particular figure?</p>

      <p>
        The first can usually be checked. The second is often not published in a way that lets you
        reproduce it. This site is built on that distinction, which is why the calculator is as
        specific about what it cannot tell you as about what it can.
      </p>

      <p>
        I am a grandmother, not a professional. I needed to understand a payment affecting my own
        family, and I spent months working through policies, rates, letters and calculations to do
        it.
      </p>

      <p>I built this site because I wished I had found that table when I first needed it.</p>

      <p>I still have the notebook.</p>

      <h2>My editorial policy</h2>

      <h3>Every figure traces to a source</h3>
      <p>
        Rates live in versioned data files with an effective date, not in the text of a page. When
        the April uprating lands, every figure across the site changes at once. A number typed into
        prose goes silently wrong every April, so the build refuses to accept one.
      </p>

      <h3>I do not publish what I have not verified</h3>
      <p>
        Where I cannot confirm a figure against its original source, I leave it out and say why.
        That is why one year of Welsh rates is missing. Working a historic rate out from an uplift
        percentage would give a number that looks precise and could be wrong by a few pounds, and a
        few pounds across two years is exactly what gets a carer&apos;s complaint dismissed.
      </p>

      <h3>I do not name a council without a source</h3>
      <p>
        Saying what a particular council does, especially where an Ombudsman has criticised it,
        requires a stored, dated, public source. Where I hold information about a council but have
        not re-sourced the link, the calculator ignores it entirely and uses the national figures
        instead. I currently cover {Object.keys(LA_REGION_MAP).length} English authorities for
        regional rates.
      </p>

      <h3>My checks run before anything is published</h3>
      <ul>
        <li>Rates must rise with age, sit in a sane range, and move plausibly year on year.</li>
        <li>Legal test cases covering the rules that must never break are run on every change, and cannot be skipped.</li>
        <li>The calculator refuses to output a fixed percentage of the fostering rate, ever.</li>
        <li>If my rates go past their end date, a warning appears on every page automatically.</li>
      </ul>

      <h3>Review schedule</h3>
      <p>
        Each of my {guides.length} guides carries my name, a &ldquo;last reviewed&rdquo; date and a
        review interval, and I am told when one falls overdue. Rate data is reviewed every April;
        the Kinship Zones pilot every three months; council information annually.
      </p>

      <h2>What this site is not</h2>
      <p>
        I am not a solicitor and I am not a social worker. This site is not a law firm, a charity,
        or part of any council or government department.
      </p>
      <p>
        I do not give advice on individual cases. Where your situation needs that, the advice
        organisations I point to throughout the site can help, and they are independent of me.
      </p>

      <h2>Corrections</h2>
      <p>
        If I have something wrong, I want to know. See my{' '}
        <a href="/contact">corrections policy</a>.
      </p>
    </>
  );
}
