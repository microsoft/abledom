/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { test as baseTest, expect } from "@playwright/test";
import type {
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import { AbleDOMReporter } from "../src/reporter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_OUTPUT_DIR = path.join(__dirname, "..", ".test-output");

// Partial mock types for testing - only includes fields used by the reporter
type MockTestCase = Pick<TestCase, "title" | "location">;
type MockTestResult = Pick<TestResult, "attachments">;
type MockFullResult = Pick<FullResult, "status">;

// Ensure test output directory exists
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

const TEST_REPORT_FILE = path.join(TEST_OUTPUT_DIR, "reporter-test-output.txt");

baseTest.describe("AbleDOMReporter", () => {
  baseTest.afterAll(() => {
    // Clean up test report file
    if (fs.existsSync(TEST_REPORT_FILE)) {
      fs.unlinkSync(TEST_REPORT_FILE);
    }
  });

  baseTest("should write report file with correct format", async () => {
    const reporter = new AbleDOMReporter({ outputFile: TEST_REPORT_FILE });

    // Simulate test run
    reporter.onBegin();

    // Simulate test end with attachment
    const mockTest: MockTestCase = {
      title: "test accessibility check",
      location: {
        file: "/path/to/test.spec.ts",
        line: 10,
        column: 5,
      },
    };

    const mockResult: MockTestResult = {
      attachments: [
        {
          name: "abledom-test-data",
          body: Buffer.from(
            JSON.stringify({
              type: "AbleDOM Issue",
              callerFile: "/path/to/test.spec.ts",
              callerLine: 25,
              callerColumn: 10,
              issueCount: 1,
              issues: [
                {
                  id: "missing-label",
                  message: "Button is missing an accessible label",
                  element: "<button>Click me</button>",
                },
              ],
              fullMessage:
                "AbleDOM found issue: Button is missing an accessible label",
            }),
          ),
          contentType: "application/json",
        },
      ],
    };

    reporter.onTestEnd(mockTest as TestCase, mockResult as TestResult);

    // Simulate end of test run
    reporter.onEnd({ status: "passed" } as MockFullResult as FullResult);

    // Verify file was created
    expect(fs.existsSync(TEST_REPORT_FILE)).toBe(true);

    // Read and verify content
    const content = fs.readFileSync(TEST_REPORT_FILE, "utf-8");

    // Verify header
    expect(content).toContain("AbleDOM Accessibility Report");
    expect(content).toContain("Generated:");
    expect(content).toContain("Total Issues: 1");

    // Verify test info
    expect(content).toContain("Test: test accessibility check");
    expect(content).toContain("Test Location: /path/to/test.spec.ts:10:5");
    expect(content).toContain("Called From: /path/to/test.spec.ts:25:10");

    // Verify issue data
    expect(content).toContain('"type": "AbleDOM Issue"');
    expect(content).toContain(
      '"message": "Button is missing an accessible label"',
    );
    expect(content).toContain("missing-label");
  });

  baseTest("should handle multiple issues in report", async () => {
    const reportFile = path.join(TEST_OUTPUT_DIR, "test-multiple-issues.txt");
    const reporter = new AbleDOMReporter({ outputFile: reportFile });

    reporter.onBegin();

    // First test with issue
    reporter.onTestEnd(
      {
        title: "first test",
        location: { file: "test1.ts", line: 1, column: 1 },
      } as MockTestCase as TestCase,
      {
        attachments: [
          {
            name: "abledom-test-data",
            body: Buffer.from(
              JSON.stringify({
                type: "AbleDOM Issue",
                callerFile: "test1.ts",
                callerLine: 10,
                callerColumn: 5,
                issues: [{ id: "issue-1", message: "First issue" }],
              }),
            ),
            contentType: "application/json",
          },
        ],
      } as MockTestResult as TestResult,
    );

    // Second test with issue
    reporter.onTestEnd(
      {
        title: "second test",
        location: { file: "test2.ts", line: 1, column: 1 },
      } as MockTestCase as TestCase,
      {
        attachments: [
          {
            name: "abledom-test-data",
            body: Buffer.from(
              JSON.stringify({
                type: "AbleDOM Issue",
                callerFile: "test2.ts",
                callerLine: 20,
                callerColumn: 3,
                issues: [{ id: "issue-2", message: "Second issue" }],
              }),
            ),
            contentType: "application/json",
          },
        ],
      } as MockTestResult as TestResult,
    );

    reporter.onEnd({ status: "passed" } as MockFullResult as FullResult);

    const content = fs.readFileSync(reportFile, "utf-8");

    expect(content).toContain("Total Issues: 2");
    expect(content).toContain("first test");
    expect(content).toContain("second test");
    expect(content).toContain("First issue");
    expect(content).toContain("Second issue");
    expect(content).toContain("Issue 1:");
    expect(content).toContain("Issue 2:");

    // Clean up
    fs.unlinkSync(reportFile);
  });

  baseTest("should handle no issues gracefully", async () => {
    const reportFile = path.join(TEST_OUTPUT_DIR, "test-no-issues.txt");
    const reporter = new AbleDOMReporter({ outputFile: reportFile });

    reporter.onBegin();

    // Test with no abledom-test-data attachment
    reporter.onTestEnd(
      {
        title: "passing test",
        location: { file: "test.ts", line: 1, column: 1 },
      } as MockTestCase as TestCase,
      { attachments: [] } as MockTestResult as TestResult,
    );

    reporter.onEnd({ status: "passed" } as MockFullResult as FullResult);

    const content = fs.readFileSync(reportFile, "utf-8");

    expect(content).toContain("Total Issues: 0");
    expect(content).toContain(
      "No accessibility issues were found during the test run.",
    );

    // Clean up
    fs.unlinkSync(reportFile);
  });

  baseTest("should use default filename when not specified", async () => {
    const reporter = new AbleDOMReporter();
    reporter.onBegin();
    reporter.onEnd({ status: "passed" } as MockFullResult as FullResult);

    const defaultPath = path.resolve(process.cwd(), "abledom-report.txt");
    expect(fs.existsSync(defaultPath)).toBe(true);

    // Clean up
    fs.unlinkSync(defaultPath);
  });
});
