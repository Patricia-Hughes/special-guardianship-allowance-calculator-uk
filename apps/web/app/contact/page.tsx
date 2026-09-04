import type { Metadata } from 'next';
import { AdviceLines } from '../../components/ui/AdviceLines';
import { Callout } from '../../components/ui/Callout';
import { ID, JsonLd, pageGraph } from '../../lib/jsonLd';

export const metadata: Metadata = {
  title: 'Contact and corrections',
  description: 'How to tell me something is wrong, and how quickly I will deal with it.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={pageGraph({
          path: '/contact',
          type: 'ContactPage',
          name: String(metadata.title),
          description: String(metadata.description),
          trail: [{ name: 'Contact', url: '/contact' }],
          mainEntity: ID.person,
        })}
      />
      <h1>Contact and corrections</h1>

      <Callout type="important">
        <p className="flush-bot">
          <strong>I cannot advise on your individual case.</strong> If you need someone to look at
          your situation, the organisations at the bottom of this page can, and they are independent
          of me.
        </p>
      </Callout>

      <h2>Corrections policy</h2>
      <p>
        If you think something on this site is wrong, a figure, a legal point, a description of a
        council&apos;s policy, please tell me.
      </p>
      <ul>
        <li>I acknowledge every correction request within <strong>5 working days</strong>.</li>
        <li>
          Where a figure or legal statement is wrong, I correct it or take it down within{' '}
          <strong>2 working days</strong> of confirming it. I do not leave a disputed figure up
          while I look into it.
        </li>
        <li>
          Corrections to anything I have said about a named council are treated as urgent and go to the top of the list.
        </li>
        <li>
          Where I change something substantive, I say so on the page rather than editing quietly.
        </li>
      </ul>
      <p>
        It helps enormously if you can tell me the page, what it says, what it should say, and a source I can check.
      </p>

      <h2>Councils</h2>
      <p>
        If you work for a council and something I have published about your authority is out of date or inaccurate, please send me the current published policy and I will update or remove the entry. I would rather be corrected than be wrong.
      </p>

      <h2>Advice organisations</h2>
      <p>
        If you would like to embed the calculator or reuse my guides, please get in touch. I would rather help you keep it current than have an out-of-date copy circulating.
      </p>

      <h2>How to reach me</h2>
      <p>
        {/*
          Deliberately not a form: the site has no backend and nothing on it may
          ever POST anywhere (see the security headers in §29.2). A published
          address is honest about where the message actually goes.
        */}
        Email <strong>patricia@specialguardianshipallowance.uk</strong>.
      </p>
      <p className="muted">
        Please do not send me details of your child or your finances. I do not need them, and I would rather not hold them.
      </p>

      <AdviceLines />
    </>
  );
}
