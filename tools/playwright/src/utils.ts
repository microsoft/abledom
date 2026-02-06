/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Normalizes a file path by removing webpack:// prefixes and similar bundler artifacts.
 * Handles cases where webpack:/ appears in the middle of the path.
 * Supports both forward slashes (Unix) and backslashes (Windows).
 * Examples:
 *   webpack:/@scope/package/src/file.ts -> @scope/package/src/file.ts
 *   prefix/webpack:/@scope/package/src/file.ts -> @scope/package/src/file.ts
 *   D:\path\webpack:\@scope\package\file.ts -> @scope/package/file.ts
 *   /absolute/path/to/file.ts -> /absolute/path/to/file.ts
 */
export function normalizeFilePath(filePath: string): string {
  // Find webpack:/ or webpack:// or webpack:\ anywhere in the path and extract everything after it
  // Handles both Unix (/) and Windows (\) path separators
  const webpackMatch = filePath.match(/webpack:[/\\]{1,2}(.+)/);
  if (webpackMatch) {
    // Normalize backslashes to forward slashes for consistency
    return webpackMatch[1].replace(/\\/g, "/");
  }

  // Remove any leading ./ from regular paths
  return filePath.replace(/^\.\//, "");
}
