/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect } from "@playwright/test";
import { normalizeFilePath } from "../src/utils.js";

test.describe("normalizeFilePath", () => {
  test("should remove webpack:/ prefix (single slash)", () => {
    const input = "webpack:/@scope/package/src/file.spec.ts";
    const expected = "@scope/package/src/file.spec.ts";
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test("should remove webpack:// prefix (double slash)", () => {
    const input = "webpack://@scope/package/src/file.spec.ts";
    const expected = "@scope/package/src/file.spec.ts";
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test("should extract path after webpack:/ when it appears in the middle", () => {
    const input =
      "some/prefix/path/webpack:/@scope/package/src/tests/my-feature.spec.ts";
    const expected = "@scope/package/src/tests/my-feature.spec.ts";
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test("should handle webpack path with nested directories", () => {
    const input = "webpack:/@org/lib/src/components/button/button.spec.ts";
    const expected = "@org/lib/src/components/button/button.spec.ts";
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test("should preserve absolute paths unchanged", () => {
    const input = "/absolute/path/to/file.spec.ts";
    expect(normalizeFilePath(input)).toBe(input);
  });

  test("should preserve relative paths without webpack prefix", () => {
    const input = "src/components/Button.test.ts";
    expect(normalizeFilePath(input)).toBe(input);
  });

  test("should remove leading ./ from paths", () => {
    const input = "./src/file.spec.ts";
    const expected = "src/file.spec.ts";
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test("should handle .js extension paths", () => {
    const input = "webpack:/@scope/package/dist/file.test.js";
    const expected = "@scope/package/dist/file.test.js";
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test("should handle empty string", () => {
    expect(normalizeFilePath("")).toBe("");
  });

  test("should handle Windows path with webpack:\\ (backslash)", () => {
    const input =
      "D:\\a\\_work\\1\\a\\project\\tests\\webpack:\\package\\tests\\file.spec.ts";
    const expected = "package/tests/file.spec.ts";
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test("should normalize backslashes to forward slashes in webpack paths", () => {
    const input = "webpack:\\package\\src\\nested\\file.spec.ts";
    const expected = "package/src/nested/file.spec.ts";
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test("should handle Windows CI path with webpack in the middle", () => {
    const input =
      "D:\\build\\agent\\project\\tests\\webpack:\\lib\\tests\\feature.spec.ts";
    const expected = "lib/tests/feature.spec.ts";
    expect(normalizeFilePath(input)).toBe(expected);
  });
});
