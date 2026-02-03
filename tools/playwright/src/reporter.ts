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

/**
 * A single entry in the accessibility report.
 */
export interface ReportEntry {
  testTitle: string;
  testFile: string;
  testLine: number;
  testColumn: number;
  data: unknown;
  timestamp: string;
}

/**
 * Options for configuring the AbleDOM reporter.
 */
export interface AbleDOMReporterOptions {
  /**
   * Output file path for the report. Defaults to 'abledom-report.json'.
   */
  outputFile?: string;
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

  constructor(options: AbleDOMReporterOptions = {}) {
    this.outputPath = options.outputFile || "abledom-report.json";
  }

  onBegin(): void {
    // Clear any existing data when test run begins
    this.collectedData = [];
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
    data: unknown,
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
      if (attachment.name === "abledom-test-data" && attachment.body) {
        try {
          const data = JSON.parse(attachment.body.toString());
          this.addData(
            test.title,
            test.location.file,
            test.location.line,
            test.location.column,
            data,
          );
        } catch {
          // Not JSON data, store as-is
          this.addData(
            test.title,
            test.location.file,
            test.location.line,
            test.location.column,
            attachment.body.toString(),
          );
        }
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnd(_result: FullResult): void {
    // Write all collected data to a file
    const outputFilePath = path.resolve(process.cwd(), this.outputPath);

    const report = {
      date: new Date().toISOString(),
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
