import { runAll } from './runner';
import { printHeader, printResults, printSummary, getExitCode } from './reporter';
import { authSuite, publicSuite, adminSuite } from './suites';
import type { TestSuite, RunContext } from './types';

const ALL_SUITES: TestSuite[] = [authSuite, publicSuite, adminSuite];

async function main() {
  printHeader();

  // Parse CLI args: --suite=auth,public  or  --suite=all (default)
  const suiteArg = process.argv.find((a) => a.startsWith('--suite='));
  const filter = suiteArg ? suiteArg.replace('--suite=', '').split(',') : null;

  const suites = filter
    ? ALL_SUITES.filter((s) => filter.some((f) => s.name.toLowerCase().includes(f.toLowerCase())))
    : ALL_SUITES;

  if (suites.length === 0) {
    console.error(`No suites matched filter: ${filter?.join(', ')}`);
    console.error(`Available: ${ALL_SUITES.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  const ctx: RunContext = {};

  try {
    const results = await runAll(suites, ctx);
    printResults(results);
    printSummary(results);
    process.exit(getExitCode(results));
  } catch (err) {
    console.error('\n  Fatal error:', err instanceof Error ? err.message : String(err));
    console.error('  Make sure the server is running on port 4000 (npm run start:dev)\n');
    process.exit(1);
  }
}

main();
