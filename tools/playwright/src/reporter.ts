/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as fs from "fs";
import * as path from "path";
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import { normalizeFilePath } from "./utils.js";

/**
 * Information about a test location.
 */
export interface TestLocation {
  testTitle: string;
  testFile: string;
  testLine: number;
  testColumn: number;
}

/**
 * A single accessibility issue found by AbleDOM.
 */
export interface AbleDOMIssue {
  /**
   * The rule ID that identified this issue.
   */
  id: string;
  /**
   * Human-readable description of the issue.
   */
  message: string;
  /**
   * The outerHTML of the element with the issue.
   */
  element?: string;
  /**
   * The outerHTML of the grandparent element (for context).
   */
  parentParent?: string;
}

/**
 * Data attached when AbleDOM finds accessibility issues.
 */
export interface AbleDOMTestData {
  type: "AbleDOM Issue";
  /**
   * File path where the issue was detected.
   */
  callerFile: string;
  /**
   * Line number in the test file.
   */
  callerLine: number;
  /**
   * Column number in the test file.
   */
  callerColumn: number;
  /**
   * Number of issues found.
   */
  issueCount: number;
  /**
   * The accessibility issues found.
   */
  issues: AbleDOMIssue[];
}

/**
 * A single entry in the accessibility report.
 */
export interface ReportEntry {
  testTitle: string;
  testFile: string;
  testLine: number;
  testColumn: number;
  data: AbleDOMTestData;
  timestamp: string;
}

/**
 * Options for configuring the AbleDOM reporter.
 */
export interface AbleDOMReporterOptions {
  /**
   * Output file path for the report. Defaults to './test-results/abledom.json'.
   */
  outputFile?: string;
}

/**
 * The complete AbleDOM accessibility report structure.
 */
export interface AbleDOMReport {
  /**
   * ISO timestamp when the report was generated.
   */
  date: string;
  /**
   * Assertions where AbleDOM instance was properly exposed (exposeInstanceForTesting: true).
   */
  goodAssertions: TestLocation[];
  /**
   * Assertions where AbleDOM instance was NOT exposed (missing exposeInstanceForTesting: true).
   */
  badAssertions: TestLocation[];
  /**
   * Collected accessibility issues and test data.
   */
  records: ReportEntry[];
}

/**
 * Playwright Reporter that collects AbleDOM accessibility issues and writes them to a file.
 *
 * @example
 * ```typescript
 * // playwright.config.ts
 * import { AbleDOMReporter } from 'abledom-playwright/reporter';
 *
 * export default defineConfig({
 *   reporter: [
 *     ['list'],
 *     [AbleDOMReporter, { outputFile: 'accessibility-report.json' }],
 *   ],
 * });
 * ```
 */
export class AbleDOMReporter implements Reporter {
  private collectedData: ReportEntry[] = [];
  private outputPath: string;
  private goodAssertions: TestLocation[] = [];
  private badAssertions: TestLocation[] = [];

  constructor(options: AbleDOMReporterOptions = {}) {
    this.outputPath = options.outputFile || "./test-results/abledom.json";
  }

  onBegin(): void {
    // Clear any existing data when test run begins
    this.collectedData = [];
    this.goodAssertions = [];
    this.badAssertions = [];
  }

  /**
   * Manually add data to the report.
   * This can be called from tests to add custom accessibility data.
   */
  addData(
    testTitle: string,
    testFile: string,
    testLine: number,
    testColumn: number,
    data: AbleDOMTestData,
  ): void {
    this.collectedData.push({
      testTitle,
      testFile,
      testLine,
      testColumn,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Collect data from test attachments
    result.attachments.forEach((attachment) => {
      if (attachment.name === "abledom-assertion" && attachment.body) {
        try {
          const data = JSON.parse(attachment.body.toString()) as {
            type: "good" | "bad";
          };
          const testLocation: TestLocation = {
            testTitle: test.title,
            testFile: normalizeFilePath(test.location.file),
            testLine: test.location.line,
            testColumn: test.location.column,
          };
          if (data.type === "good") {
            this.goodAssertions.push(testLocation);
          } else if (data.type === "bad") {
            this.badAssertions.push(testLocation);
          }
        } catch {
          // Ignore malformed assertion data
        }
      } else if (attachment.name === "abledom-test-data" && attachment.body) {
        try {
          const data = JSON.parse(
            attachment.body.toString(),
          ) as AbleDOMTestData;
          this.addData(
            test.title,
            normalizeFilePath(test.location.file),
            test.location.line,
            test.location.column,
            data,
          );
        } catch {
          // Ignore malformed test data
        }
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnd(_result: FullResult): void {
    // Write all collected data to a file
    const outputFilePath = path.resolve(process.cwd(), this.outputPath);

    const report: AbleDOMReport = {
      date: new Date().toISOString(),
      goodAssertions: this.goodAssertions,
      badAssertions: this.badAssertions,
      records: this.collectedData,
    };

    const content = JSON.stringify(report, null, 2);

    // Ensure directory exists
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputFilePath, content, "utf-8");
    console.log(`AbleDOM report written to: ${outputFilePath}`);
  }
}

// Export the class as default for Playwright config
export default AbleDOMReporter;
