import type { TestResult } from './types';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const b = (s: string) => `${C.bold}${s}${C.reset}`;
const g = (s: string) => `${C.green}${s}${C.reset}`;
const r = (s: string) => `${C.red}${s}${C.reset}`;
const y = (s: string) => `${C.yellow}${s}${C.reset}`;
const d = (s: string) => `${C.dim}${s}${C.reset}`;

export function printHeader(): void {
  console.log(`\n${b(C.cyan + '  ══ PC Store API Test Runner ══' + C.reset)}\n`);
}

export function printResults(results: TestResult[]): void {
  let lastSuite = '';

  for (const res of results) {
    if (res.suite !== lastSuite) {
      console.log(`\n  ${b(res.suite)}`);
      lastSuite = res.suite;
    }

    const icon = res.status === 'pass' ? g('✓') : res.status === 'skip' ? y('○') : r('✗');
    const ms = res.duration > 0 ? d(` (${res.duration}ms)`) : '';
    const code = res.httpStatus ? d(`[${res.httpStatus}] `) : '';

    console.log(`    ${icon} ${code}${res.name}${ms}`);

    if (res.status === 'fail' && res.error) {
      const lines = res.error.split('\n');
      for (const line of lines) {
        console.log(`      ${r('→')} ${line}`);
      }
    }
  }
}

export function printSummary(results: TestResult[]): void {
  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const skip = results.filter((r) => r.status === 'skip').length;
  const total = results.length;
  const totalMs = results.reduce((a, r) => a + r.duration, 0);

  const bar = '─'.repeat(44);
  console.log(`\n  ${C.dim}${bar}${C.reset}`);
  console.log(
    `  ${b('Tests:')} ${total}  ` +
    `${g(`✓ ${pass} passed`)}  ` +
    `${fail > 0 ? r(`✗ ${fail} failed`) : d(`✗ ${fail} failed`)}  ` +
    `${skip > 0 ? y(`○ ${skip} skipped`) : d(`○ ${skip} skipped`)}`,
  );
  console.log(`  ${b('Time:')}  ${totalMs}ms total\n`);
}

export function getExitCode(results: TestResult[]): number {
  return results.some((r) => r.status === 'fail') ? 1 : 0;
}
