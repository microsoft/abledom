/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Normalizes a file path by removing webpack:// prefixes and similar bundler artifacts.
 * Handles cases where webpack:/ appears in the middle of the path.
 * Examples:
 *   webpack:/@scope/package/src/file.ts -> @scope/package/src/file.ts
 *   prefix/webpack:/@scope/package/src/file.ts -> @scope/package/src/file.ts
 *   /absolute/path/to/file.ts -> /absolute/path/to/file.ts
 */
export function normalizeFilePath(filePath: string): string {
  // Find webpack:/ or webpack:// anywhere in the path and extract everything after it
  const webpackMatch = filePath.match(/webpack:\/\/?(.+)/);
  if (webpackMatch) {
    return webpackMatch[1];
  }

  // Remove any leading ./ from regular paths
  return filePath.replace(/^\.\//, "");
}
