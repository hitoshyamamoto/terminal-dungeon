// ============================================================================
// TEST FRAMEWORK - Base testing utilities
// ============================================================================

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface TestSuite {
  name: string;
  tests: Test[];
}

export interface Test {
  name: string;
  fn: () => void | Promise<void>;
}

export class TestRunner {
  private suites: TestSuite[] = [];
  private results: TestResult[] = [];
  private verbose: boolean;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
  }

  suite(name: string, tests: Test[]): void {
    this.suites.push({ name, tests });
  }

  async run(): Promise<{ total: number; passed: number; failed: number }> {
    console.log("\n" + "=".repeat(80));
    console.log("TERMINAL DUNGEON - AUTOMATED TEST SUITE");
    console.log("=".repeat(80) + "\n");

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const suite of this.suites) {
      console.log(`\n📦 ${suite.name}`);
      console.log("-".repeat(80));

      for (const test of suite.tests) {
        totalTests++;
        const result = await this.runTest(test);
        this.results.push(result);

        if (result.passed) {
          passedTests++;
          console.log(`  ✓ ${test.name} ${this.dim(`(${result.duration}ms)`)}`);
        } else {
          failedTests++;
          console.log(`  ✗ ${test.name}`);
          if (this.verbose && result.error) {
            console.log(`    ${this.red(result.error)}`);
          }
        }
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("TEST SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total:  ${totalTests}`);
    console.log(`${this.green("Passed:")} ${passedTests}`);
    console.log(`${this.red("Failed:")} ${failedTests}`);
    console.log(`${this.dim("Time:")}   ${this.getTotalTime()}ms`);
    console.log("=".repeat(80) + "\n");

    return { total: totalTests, passed: passedTests, failed: failedTests };
  }

  private async runTest(test: Test): Promise<TestResult> {
    const start = Date.now();
    try {
      await test.fn();
      return {
        name: test.name,
        passed: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        name: test.name,
        passed: false,
        error: (error as Error).message,
        duration: Date.now() - start,
      };
    }
  }

  private getTotalTime(): number {
    return this.results.reduce((sum, r) => sum + r.duration, 0);
  }

  private green(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
  }

  private red(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
  }

  private dim(text: string): string {
    return `\x1b[2m${text}\x1b[0m`;
  }
}

// Test assertions
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

export function assertNotEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    throw new Error(
      message || `Expected value to not equal ${expected}`
    );
  }
}

export function assertGreaterThan(actual: number, expected: number, message?: string): void {
  if (actual <= expected) {
    throw new Error(
      message || `Expected ${actual} to be greater than ${expected}`
    );
  }
}

export function assertLessThan(actual: number, expected: number, message?: string): void {
  if (actual >= expected) {
    throw new Error(
      message || `Expected ${actual} to be less than ${expected}`
    );
  }
}

export function assertContains<T>(array: T[], item: T, message?: string): void {
  if (!array.includes(item)) {
    throw new Error(
      message || `Expected array to contain ${item}`
    );
  }
}

export function assertThrows(fn: () => void, message?: string): void {
  try {
    fn();
    throw new Error(message || "Expected function to throw");
  } catch (error) {
    // Expected
  }
}
