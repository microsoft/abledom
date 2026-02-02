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
   * Output file path for the report. Defaults to 'abledom-report.txt'.
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
 *     [AbleDOMReporter, { outputFile: 'accessibility-report.txt' }],
 *   ],
 * });
 * ```
 */
export class AbleDOMReporter implements Reporter {
  private collectedData: ReportEntry[] = [];
  private outputPath: string;

  constructor(options: AbleDOMReporterOptions = {}) {
    this.outputPath = options.outputFile || "abledom-report.txt";
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

    let content = "AbleDOM Accessibility Report\n";
    content += "=".repeat(80) + "\n";
    content += `Generated: ${new Date().toISOString()}\n`;
    content += `Total Issues: ${this.collectedData.length}\n`;
    content += "=".repeat(80) + "\n\n";

    if (this.collectedData.length === 0) {
      content += "No accessibility issues were found during the test run.\n";
    } else {
      this.collectedData.forEach((entry, index) => {
        content += `Issue ${index + 1}:\n`;
        content += `  Test: ${entry.testTitle}\n`;
        content += `  Test Location: ${entry.testFile}:${entry.testLine}:${entry.testColumn}\n`;

        // Check if this is an AbleDOM issue with caller location
        if (
          typeof entry.data === "object" &&
          entry.data !== null &&
          "type" in entry.data &&
          (entry.data as { type: unknown }).type === "AbleDOM Issue" &&
          "callerFile" in entry.data &&
          "callerLine" in entry.data &&
          "callerColumn" in entry.data
        ) {
          const issueData = entry.data as {
            callerFile: string;
            callerLine: number;
            callerColumn: number;
          };
          content += `  Called From: ${issueData.callerFile}:${issueData.callerLine}:${issueData.callerColumn}\n`;
        }

        content += `  Time: ${entry.timestamp}\n`;
        content += `  Data:\n`;

        // Format the data nicely
        if (typeof entry.data === "object") {
          content += `    ${JSON.stringify(entry.data, null, 4).split("\n").join("\n    ")}\n`;
        } else {
          content += `    ${entry.data}\n`;
        }

        content += "-".repeat(80) + "\n\n";
      });
    }

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
