/**
 * Test setup for the web app.
 *
 * jest-dom gives the readable DOM matchers (toHaveTextContent and friends).
 * Without it a failing render test reports a null and leaves you guessing.
 */
import '@testing-library/jest-dom/vitest';
