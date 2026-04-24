import { getByPath } from './context';

export interface AssertionFailure {
  path: string;
  expected: unknown;
  actual: unknown;
}

/** Kiểm tra tất cả dot-path trong expected có khớp trong actual không */
export function matchBody(
  actual: unknown,
  expected: Record<string, unknown>,
): AssertionFailure[] {
  const failures: AssertionFailure[] = [];
  for (const [path, expectedVal] of Object.entries(expected)) {
    const actualVal = getByPath(actual, path);
    if (!looseEqual(actualVal, expectedVal)) {
      failures.push({ path, expected: expectedVal, actual: actualVal });
    }
  }
  return failures;
}

function looseEqual(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (expected === null || expected === undefined) return actual == null;
  if (typeof expected === 'string' && typeof actual === 'string') {
    return actual === expected;
  }
  if (typeof expected === 'number') return Number(actual) === expected;
  if (typeof expected === 'boolean') return actual === expected;
  if (typeof expected === 'object' && typeof actual === 'object' && actual !== null) {
    for (const [k, v] of Object.entries(expected as Record<string, unknown>)) {
      if (!looseEqual((actual as Record<string, unknown>)[k], v)) return false;
    }
    return true;
  }
  return false;
}
