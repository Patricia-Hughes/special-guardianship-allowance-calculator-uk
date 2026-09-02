import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description: 'What this site does and does not do with your information. Short version: it never receives it.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy notice</h1>
      <p className="big">
        <strong>
          We do not collect, store or process any personal information about you or your child.
        </strong>{' '}
        That is not a policy promise. It is how the site is built.
      </p>

      <h2>How the calculator works</h2>
      <p>
        Everything the calculator does happens inside your own browser. There is no server that
        performs the calculation, and therefore nothing for your answers to be sent to. Your
        child&apos;s age, your income, your savings, your benefits, none of it leaves the device
        you are reading this on.
      </p>
      <p>
        We built it this way deliberately. Financial and family circumstances about a child are
        about as sensitive as personal data gets, and the safest way to protect information is not
        to receive it.
      </p>

      <h2>The one thing that is sent anywhere</h2>
      <p>
        If you use the &ldquo;find my council&rdquo; button, we send the first part of your postcode
        (like <code>SW1A</code>) to <a href="https://postcodes.io/">postcodes.io</a>, a free public
        service, to look up which council covers that area. That is the only outbound request
        carrying anything you typed.
      </p>
      <ul>
        <li>It only happens when you press the button. Never as you type.</li>
        <li>Only the outward code is sent, not the full postcode.</li>
        <li>Nothing else you have entered is sent with it.</li>
        <li>We use the answer and discard it. We do not store it, log it, or put it in the web address.</li>
        <li>You never have to use it. Choosing your council or region from the list works just as well.</li>
      </ul>

      <h2>Cookies</h2>
      <p>We do not set any cookies. There is no cookie banner because there is nothing to consent to.</p>

      <h2>Analytics</h2>
      <p>
        We do not run analytics on this site. Nothing counts your visit, nothing follows you
        between pages, and nothing is sent anywhere when you use the calculator.
      </p>
      <p>
        That is a decision rather than an oversight, taken in August 2026 and checked
        automatically every time this site is built. If it ever changes, it will be a cookieless
        tool that never records anything you type, and this page will say so before it happens.
      </p>

      <h2>Sharing a result</h2>
      <p>
        The share link contains your nation, region or council, your children&apos;s ages, and
        whether you were a foster carer. It never contains anything about your finances, your
        benefits, or your postcode. Web addresses end up in browser history, server logs and
        messaging app previews, so we keep the sensitive things out of them entirely.
      </p>

      <h2>Saved progress</h2>
      <p>
        We do not save your progress. If you refresh the page you will start again. That is
        deliberate: shared and family computers are the normal case for the people who use this
        site.
      </p>

      <h2>Your rights</h2>
      <p>
        Data protection law gives you rights over personal data an organisation holds about you.
        Since we hold none, there is nothing for us to give you access to, correct, or delete. If
        you think that is wrong, please{' '}
        <a href="/contact">get in touch</a> and we will look into it.
      </p>
    </>
  );
}
