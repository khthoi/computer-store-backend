import type { TestSuite, TestResult, RunContext } from './types';
import { request } from './client';
import { getToken } from './auth';
import { interpolate, interpolateAny, extractValues } from './context';
import { matchBody } from './assert';

export async function runSuite(suite: TestSuite, ctx: RunContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const tc of suite.cases) {
    if (tc.skip) {
      results.push({ suite: suite.name, name: tc.name, status: 'skip', duration: 0 });
      continue;
    }

    const start = Date.now();

    try {
      const headers: Record<string, string> = { ...(tc.headers ?? {}) };

      if (tc.auth && tc.auth !== 'none') {
        const token = await getToken(tc.auth);
        headers['Authorization'] = `Bearer ${token}`;
      }

      const path = interpolate(tc.path, ctx);
      const body = tc.body !== undefined ? interpolateAny(tc.body, ctx) : undefined;

      const query: Record<string, string | number> = {};
      if (tc.query) {
        for (const [k, v] of Object.entries(tc.query)) {
          query[k] = typeof v === 'string' ? interpolate(v, ctx) : v;
        }
      }

      const res = await request(tc.method, path, { headers, body, query });
      const duration = Date.now() - start;

      // Status check
      if (res.status !== tc.expect.status) {
        const snippet = JSON.stringify(res.body).slice(0, 300);
        results.push({
          suite: suite.name, name: tc.name, status: 'fail', duration,
          httpStatus: res.status,
          error: `Expected HTTP ${tc.expect.status}, got ${res.status}. Body: ${snippet}`,
        });
        continue;
      }

      // Body match
      if (tc.expect.bodyMatch) {
        const failures = matchBody(res.body, tc.expect.bodyMatch);
        if (failures.length > 0) {
          const msgs = failures.map(
            (f) => `${f.path}: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}`,
          );
          results.push({
            suite: suite.name, name: tc.name, status: 'fail', duration,
            httpStatus: res.status,
            error: `Body mismatch — ${msgs.join('; ')}`,
          });
          continue;
        }
      }

      // Contains
      if (tc.expect.contains && !res.raw.includes(tc.expect.contains)) {
        results.push({
          suite: suite.name, name: tc.name, status: 'fail', duration,
          httpStatus: res.status,
          error: `Response does not contain: "${tc.expect.contains}"`,
        });
        continue;
      }

      // Header check
      let headerFail: string | undefined;
      if (tc.expect.headers) {
        for (const [hk, hv] of Object.entries(tc.expect.headers)) {
          const actual = res.headers[hk.toLowerCase()] ?? '';
          if (!actual.includes(hv)) {
            headerFail = `Header "${hk}": expected to contain "${hv}", got "${actual}"`;
            break;
          }
        }
      }
      if (headerFail) {
        results.push({
          suite: suite.name, name: tc.name, status: 'fail', duration,
          httpStatus: res.status, error: headerFail,
        });
        continue;
      }

      // Extract values for subsequent cases
      if (tc.extract) extractValues(res.body, tc.extract, ctx);

      results.push({ suite: suite.name, name: tc.name, status: 'pass', duration, httpStatus: res.status });
    } catch (err) {
      results.push({
        suite: suite.name, name: tc.name, status: 'fail',
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

export async function runAll(suites: TestSuite[], sharedCtx: RunContext = {}): Promise<TestResult[]> {
  const all: TestResult[] = [];
  for (const suite of suites) {
    const results = await runSuite(suite, sharedCtx);
    all.push(...results);
  }
  return all;
}
