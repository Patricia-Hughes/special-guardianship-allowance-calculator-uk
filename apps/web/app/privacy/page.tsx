import type { Metadata } from 'next';
import { JsonLd, pageGraph } from '../../lib/jsonLd';
import { ConsentControls } from '../../components/ui/ConsentControls';
import { AdvertisingPreferences } from '../../components/ui/Advertising';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description: 'How calculator answers stay on your device, how optional analytics and advertising work, and how to change your privacy choices.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={pageGraph({
          path: '/privacy',
          name: String(metadata.title),
          description: String(metadata.description),
          trail: [{ name: 'Privacy', url: '/privacy' }],
        })}
      />
      <h1>Privacy notice</h1>
      <p className="big">
        <strong>
          Your calculator answers stay in your browser.
        </strong>{' '}
        Optional analytics count which pages you look at, only when analytics are available
        on this site and you agree to them.
      </p>

      <h2>How the calculator works</h2>
      <p>
        Everything the calculator does happens inside your own browser. There is no server that
        performs the calculation, and therefore nothing for your answers to be sent to. Your
        child&apos;s age, your income, your savings, your benefits, none of it leaves the device
        you are reading this on.
      </p>
      <p>
        I built it this way deliberately. Financial and family circumstances about a child are about as sensitive as personal data gets, and the safest way to protect information is not to receive it.
      </p>

      <h2>Optional postcode lookup</h2>
      <p>
        If you use the &ldquo;find my council&rdquo; button, your browser sends the first part of your postcode
        (like <code>SW1A</code>) to <a href="https://postcodes.io/">postcodes.io</a>, a free public
        service, to look up which council covers that area. That is the only outbound request
        carrying anything you typed.
      </p>
      <ul>
        <li>It only happens when you press the button. Never as you type.</li>
        <li>Only the outward code is sent, not the full postcode.</li>
        <li>Nothing else you have entered is sent with it.</li>
        <li>The answer is used and then discarded. I do not store it, log it, or put it in the web address.</li>
        <li>You never have to use it. Choosing your council or region from the list works just as well.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        I set no analytics cookies unless you agree. When analytics are available, the
        banner asks for your choice. Until you answer, nothing is counted.
      </p>
      <p>
        If you say yes, Google Analytics sets its own cookies on your device to recognise a
        returning visit. If you say no, it never loads and no cookie is set. Your answer is
        remembered in your own browser, which is the one thing kept either way, and it is not
        sent anywhere.
      </p>

      <h2>Analytics</h2>
      <p>
        <strong>Only if you agree.</strong> When analytics are enabled, I use Google Analytics to see which pages people
        find useful and which ones they leave. Analytics consent is separate from advertising
        consent, described below.
      </p>
      <p>What Google receives when you have agreed:</p>
      <ul>
        <li>Which pages you looked at, and in what order.</li>
        <li>Roughly where in the world you are, worked out from your IP address.</li>
        <li>What kind of device and browser you used.</li>
      </ul>
      <p>What it never receives, whichever you choose:</p>
      <ul>
        <li>
          Anything you type into the calculator. Your child&apos;s age, your income, your
          savings and your benefits stay in your browser, exactly as described above.
        </li>
        <li>
          The details inside a shared result link. Those addresses carry ages and a council, so
          the site deliberately reports only the plain page address to Google, with everything
          after the question mark removed.
        </li>
        <li>Your full postcode, which never leaves your browser at all.</li>
      </ul>
      <p>
        Google Analytics advertising features and Google Signals are switched off. The site
        does not use Analytics data to personalise ads. Google&apos;s own notice
        explains what it does with it:{' '}
        <a href="https://policies.google.com/privacy">policies.google.com/privacy</a>.
      </p>
      <p>
        Saying no changes nothing about how the site works. There is no feature behind the
        question and no reminder if you decline.
      </p>

      <h2>Changing your mind</h2>
      <p>
        You can turn analytics on or off here, at any time, as easily as you first answered.
        The choice is stored on this device, so a different browser or a private window will
        ask you again.
      </p>
      <ConsentControls />

      <h2>Advertising and your choices</h2>
      <p>
        This site can show Google AdSense advertisements on guides and rate pages.
        The status below shows whether it has been enabled. The calculator does not load AdSense
        or its advertising consent service. Pages opened with information after a question mark
        or a hash in their address do not load those services either.
      </p>
      <p>
        When advertising is enabled, Google&apos;s consent service presents the advertising choices
        and remembers your decision. It needs to communicate with Google to display those choices,
        which exposes connection information such as your IP address and browser type. AdSense
        is requested only after the consent service reports consent to Google and to storing or
        accessing information on your device. A missing or failed consent response does not enable ads.
      </p>
      <p>
        If you consent, Google and the advertising partners identified in the consent message may
        use cookies or similar storage, device information, IP address and the editorial page you
        visit to deliver, personalise and measure advertising, subject to your choices. This may
        involve processing outside the UK. The consent message identifies the purposes and partners;
        Google&apos;s policies explain its processing and safeguards. Calculator answers are not sent
        to the advertising service. Declining advertising consent does not restrict the guides or calculator.
      </p>
      <AdvertisingPreferences />
      <p>
        Advertising choices are separate from the analytics controls above. Use the advertising
        choices here to withdraw consent when the service is enabled. A different browser or cleared
        storage may require another choice. Withdrawal stops future use on this site; it does not
        undo processing that has already happened.
      </p>
      <ul>
        <li><a href="https://policies.google.com/technologies/ads">How Google uses information for advertising</a></li>
        <li><a href="https://myadcenter.google.com/">Google Ads Settings (My Ad Center)</a></li>
        <li><a href="https://optout.aboutads.info/">AboutAds advertising choices</a></li>
        <li><a href="https://www.youronlinechoices.com/uk/your-ad-choices">Your Online Choices</a></li>
      </ul>
      <p>These external preference services supplement the consent controls on this site.</p>

      <h2>Sharing a result</h2>
      <p>
        The share link contains your nation, region or council, your children&apos;s ages, and
        whether you were a foster carer. It never contains anything about your finances, your
        benefits, or your postcode. Web addresses end up in browser history, server logs and
        messaging app previews, so I keep the sensitive things out of them entirely.
      </p>

      <h2>Saved progress</h2>
      <p>
        I do not save your progress. If you refresh the page you will start again. That is deliberate: shared and family computers are the normal case for the people who use this site.
      </p>

      <h2>Your rights</h2>
      <p>
        Data protection law gives you rights over personal data an organisation holds about you.
        I do not receive or hold your calculator answers. The hosting provider receives connection
        information when serving a page, and optional services process the information described
        above. If you contact me, I receive the information you include in your message. Do not
        send a child&apos;s identifying details or sensitive financial documents.
      </p>
      <p>
        If you agreed to analytics or advertising, Google may hold information as described above.
        You can change those choices here, and Google&apos;s privacy notice explains how to exercise
        rights over information it holds. Contact me about information you sent directly to me.
      </p>
      <p>
        If you think any of this is wrong, please <a href="/contact">get in touch</a> and I will
        look into it.
      </p>
    </>
  );
}
