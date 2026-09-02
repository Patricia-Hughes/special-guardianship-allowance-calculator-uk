'use client';

/**
 * What someone sees when a page fails to render.
 *
 * Without this, React unmounts the tree and the page goes white, which is
 * indistinguishable from a broken site and tells nobody anything. It matters
 * more here than on most sites: the money formatter deliberately refuses to
 * display a figure it cannot trust, and refusing is only better than showing a
 * wrong number if the person is told what happened.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="container site-main">
      <h1>Something went wrong on this page</h1>
      <p>
        The calculator stopped rather than show you a figure it could not stand behind. That is
        deliberate, but it means you have not got an answer, and we are sorry.
      </p>
      <p>Try again. If it keeps happening, the guides and the rate tables still work.</p>
      <div className="row gap-lg">
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
        <a className="btn btn--secondary" href="/">
          Start again
        </a>
        <a className="btn btn--secondary" href="/rates">
          See the rate tables
        </a>
      </div>
      <p className="gap-xl">
        Nothing you typed was sent anywhere. It was only ever in your own browser, and this page has
        not kept it.
      </p>
    </main>
  );
}
