import { AdviceLines } from '../components/ui/AdviceLines';

export default function NotFound() {
  return (
    <>
      <h1>That page does not exist</h1>
      <p>
        It may have moved, or the address may have a typo in it. Nothing you were doing has been
        lost. The calculator never saves anything anyway.
      </p>
      <ul>
        <li>
          <a href="/">Work out what your allowance should be</a>
        </li>
        <li>
          <a href="/guidance">All the guides</a>
        </li>
        <li>
          <a href="/rates">The current rates</a>
        </li>
      </ul>
      <AdviceLines />
    </>
  );
}
