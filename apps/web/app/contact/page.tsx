import type { Metadata } from 'next';
import { AdviceLines } from '../../components/ui/AdviceLines';
import { Callout } from '../../components/ui/Callout';

export const metadata: Metadata = {
  title: 'Contact and corrections',
  description: 'How to tell us something is wrong, and how quickly we will deal with it.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <h1>Contact and corrections</h1>

      <Callout type="important">
        <p style={{ marginBottom: 0 }}>
          <strong>We cannot advise on your individual case.</strong> If you need someone to look at
          your situation, the organisations at the bottom of this page can, and they are independent
          of us.
        </p>
      </Callout>

      <h2>Corrections policy</h2>
      <p>
        If you think something on this site is wrong, a figure, a legal point, a description of a
        council&apos;s policy, please tell us.
      </p>
      <ul>
        <li>We acknowledge every correction request within <strong>5 working days</strong>.</li>
        <li>
          Where a figure or legal statement is wrong, we correct it or take it down within{' '}
          <strong>2 working days</strong> of confirming it. We do not leave a disputed figure up
          while we investigate.
        </li>
        <li>
          Corrections to anything we have said about a named council are treated as urgent and go
          to the top of the list.
        </li>
        <li>
          Where we change something substantive, we say so on the page rather than editing quietly.
        </li>
      </ul>
      <p>
        It helps enormously if you can tell us the page, what it says, what it should say, and a
        source we can check.
      </p>

      <h2>Councils</h2>
      <p>
        If you work for a council and something we have published about your authority is out of
        date or inaccurate, please send us the current published policy and we will update or remove
        the entry. We would rather be corrected than be wrong.
      </p>

      <h2>Advice organisations</h2>
      <p>
        If you would like to embed the calculator or reuse our guides, please get in touch. We would
        rather help you keep it current than have an out-of-date copy circulating.
      </p>

      <h2>How to reach us</h2>
      <p>
        {/*
          Deliberately not a form: the site has no backend and nothing on it may
          ever POST anywhere (see the security headers in §29.2). A published
          address is honest about where the message actually goes.
        */}
        Email <strong>corrections@example.invalid</strong>.
      </p>
      <p style={{ color: 'var(--colour-text-muted)' }}>
        Please do not send us details of your child or your finances. We do not need them, and we
        would rather not hold them.
      </p>

      <AdviceLines />
    </>
  );
}
