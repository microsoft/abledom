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
const REPORT_FILE = path.join(TEST_OUTPUT_DIR, "integration-report.json");

// Store report for all tests to use
let report: {
  date: string;
  records: Array<{
    testTitle: string;
    testFile: string;
    testLine: number;
    testColumn: number;
    data: Record<string, unknown>;
    timestamp: string;
  }>;
} = { date: "", records: [] };

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

    // Read and parse JSON for subsequent tests
    const content = fs.readFileSync(REPORT_FILE, "utf-8");
    report = JSON.parse(content);
    expect(report.records.length).toBeGreaterThan(0);
  });

  baseTest("should contain report date", () => {
    expect(report.date).toBeDefined();
    expect(new Date(report.date).getTime()).not.toBeNaN();
  });

  baseTest("should contain issues from fixture-based tests", () => {
    // Should have 2 records (one test has 1 issue, another has 2 issues bundled)
    expect(report.records.length).toBe(2);

    const allIssues = report.records.flatMap(
      (r) => (r.data.issues as Array<{ id: string; message: string }>) || [],
    );

    // Issue from first test
    expect(
      allIssues.some((i) => i.message === "Integration test issue one"),
    ).toBe(true);
    expect(allIssues.some((i) => i.id === "integration-issue-1")).toBe(true);

    // Issues from second test (bundled together)
    expect(
      allIssues.some((i) => i.message === "Integration test issue two"),
    ).toBe(true);
    expect(
      allIssues.some((i) => i.message === "Integration test issue three"),
    ).toBe(true);
    expect(allIssues.some((i) => i.id === "integration-issue-2")).toBe(true);
    expect(allIssues.some((i) => i.id === "integration-issue-3")).toBe(true);
  });

  baseTest("should contain correct test names", () => {
    const testTitles = report.records.map((r) => r.testTitle);
    expect(testTitles).toContain("integration test with single issue");
    expect(testTitles).toContain("integration test with multiple issues");
    // The test with no issues should NOT appear in the report
    expect(testTitles).not.toContain("integration test with no issues");
  });

  baseTest("should contain caller locations", () => {
    for (const record of report.records) {
      expect(record.data.callerFile).toBeDefined();
      expect(record.data.callerLine).toBeDefined();
      expect(record.data.callerColumn).toBeDefined();
      expect(String(record.data.callerFile)).toContain("sample.spec.ts");
    }
  });

  baseTest("should contain proper data structure", () => {
    for (const record of report.records) {
      expect(record.data.type).toBe("AbleDOM Issue");
      expect(record.data.issueCount).toBeDefined();
      expect(record.data.issues).toBeDefined();
      expect(record.data.fullMessage).toBeDefined();
    }
  });

  baseTest("should contain element HTML in report", () => {
    const content = JSON.stringify(report);
    // Elements should be serialized with their HTML
    expect(content).toContain("<button");
    expect(content).toContain("<input");
  });

  baseTest("cleanup", () => {
    // Clean up test-results directory but keep the report file for inspection
    const testResultsDir = path.join(INTEGRATION_DIR, "test-results");
    if (fs.existsSync(testResultsDir)) {
      fs.rmSync(testResultsDir, { recursive: true });
    }
  });
});
