/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { test as baseTest, expect } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INTEGRATION_DIR = path.join(__dirname, "integration");
const TEST_OUTPUT_DIR = path.join(__dirname, "..", ".test-output");
const REPORT_FILE = path.join(TEST_OUTPUT_DIR, "integration-report.txt");

// Store report content for all tests to use
let reportContent: string = "";

baseTest.describe.serial("fixture and reporter integration", () => {
  baseTest("run integration test suite and generate report", () => {
    // Clean up any existing report
    if (fs.existsSync(REPORT_FILE)) {
      fs.unlinkSync(REPORT_FILE);
    }

    // Run the integration test suite as a subprocess
    execSync("npx playwright test --config=playwright.config.ts", {
      cwd: INTEGRATION_DIR,
      stdio: "pipe",
      env: { ...process.env, CI: "" },
    });

    // Verify file was created
    expect(fs.existsSync(REPORT_FILE)).toBe(true);

    // Read content for subsequent tests
    reportContent = fs.readFileSync(REPORT_FILE, "utf-8");
    expect(reportContent.length).toBeGreaterThan(0);
  });

  baseTest("should contain report header", () => {
    expect(reportContent).toContain("AbleDOM Accessibility Report");
    expect(reportContent).toContain("Generated:");
    expect(reportContent).toContain("Total Issues:");
  });

  baseTest("should contain issues from fixture-based tests", () => {
    // Should have 2 entries (one test has 1 issue, another has 2 issues bundled)
    expect(reportContent).toContain("Total Issues: 2");

    // Issue from first test
    expect(reportContent).toContain("Integration test issue one");
    expect(reportContent).toContain("integration-issue-1");

    // Issues from second test (bundled together)
    expect(reportContent).toContain("Integration test issue two");
    expect(reportContent).toContain("Integration test issue three");
    expect(reportContent).toContain("integration-issue-2");
    expect(reportContent).toContain("integration-issue-3");
  });

  baseTest("should contain correct test names", () => {
    expect(reportContent).toContain("Test: integration test with single issue");
    expect(reportContent).toContain(
      "Test: integration test with multiple issues",
    );
    // The test with no issues should NOT appear in the report
    expect(reportContent).not.toContain(
      "Test: integration test with no issues",
    );
  });

  baseTest("should contain caller locations", () => {
    expect(reportContent).toContain("Called From:");
    expect(reportContent).toContain("sample.spec.ts");
    expect(reportContent).toContain('"callerFile":');
    expect(reportContent).toContain('"callerLine":');
    expect(reportContent).toContain('"callerColumn":');
  });

  baseTest("should contain proper JSON data structure", () => {
    expect(reportContent).toContain('"type": "AbleDOM Issue"');
    expect(reportContent).toContain('"issueCount":');
    expect(reportContent).toContain('"issues":');
    expect(reportContent).toContain('"fullMessage":');
  });

  baseTest("should contain element HTML in report", () => {
    // Elements should be serialized with their HTML
    expect(reportContent).toContain("<button");
    expect(reportContent).toContain("<input");
  });

  baseTest("cleanup", () => {
    // Clean up test-results directory but keep the report file for inspection
    const testResultsDir = path.join(INTEGRATION_DIR, "test-results");
    if (fs.existsSync(testResultsDir)) {
      fs.rmSync(testResultsDir, { recursive: true });
    }
  });
});
