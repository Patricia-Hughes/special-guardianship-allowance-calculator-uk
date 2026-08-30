/**
 * Engine error taxonomy.
 *
 * These are distinguished because the UI treats them differently (spec §33):
 *  - ValidationError    → show the field error, keep the user on the step
 *  - DataError          → "we don't have verified rates for that date yet"
 *  - GuardrailViolation → never shown raw; log the rule code and fall back
 *  - MoneyError         → a programming error; should never reach a user
 */

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A money value that is not an integer number of pence, or an unparseable input. */
export class MoneyError extends EngineError {}

/** Reference data is missing, stale, or not yet sourced. Never guess past this. */
export class DataError extends EngineError {}

/** Input failed schema validation. Carries the field path for the form to highlight. */
export class ValidationError extends EngineError {
  constructor(
    message: string,
    public readonly issues: ReadonlyArray<{ path: string; message: string }> = [],
  ) {
    super(message);
  }
}
