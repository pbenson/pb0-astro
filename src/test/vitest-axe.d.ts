/**
 * vitest-axe ships matchers but no ambient declaration for them, so
 * `expect(...).toHaveNoViolations()` type-checks nowhere even though
 * src/test/setup.ts registers it. Declare the matcher against Vitest's
 * Assertion interface once, here, for every a11y test.
 */
import 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
