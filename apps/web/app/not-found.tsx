import { AdviceLines } from '../components/ui/AdviceLines';

export default function NotFound() {
  return (
    <>
      <h1>We could not find that page</h1>
      <p>
        It may have moved, or the address may have a typo in it. Nothing you were doing has been
        lost — the calculator never saves anything.
      </p>
      <ul>
        <li>
          <a href="/">Work out what your allowance should be</a>
        </li>
        <li>
          <a href="/guidance">All our guides</a>
        </li>
        <li>
          <a href="/rates">The current rates</a>
        </li>
      </ul>
      <AdviceLines />
    </>
  );
}
