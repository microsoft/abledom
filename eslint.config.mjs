import js from "@eslint/js";
import _import from "eslint-plugin-import";
import header from "eslint-plugin-header";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

header.rules.header.meta.schema = false;

export default [
  {
    ignores: ["**/*.config.js", "**/dist", "**/node_modules"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      import: _import,
      header,
    },
    rules: {
      ...js.configs.recommended.rules,
      curly: "error",
      eqeqeq: ["error", "smart"],
      "guard-for-in": "error",
      "id-denylist": "off",
      "id-match": "off",
      "import/order": "error",
      "no-bitwise": "off",
      "no-caller": "error",
      "no-console": [
        "error",
        {
          allow: [
            "log",
            "warn",
            "dir",
            "timeLog",
            "assert",
            "clear",
            "count",
            "countReset",
            "group",
            "groupEnd",
            "table",
            "dirxml",
            "error",
            "groupCollapsed",
            "Console",
            "profile",
            "profileEnd",
            "timeStamp",
            "context",
          ],
        },
      ],
      "no-debugger": "error",
      "no-empty": "error",
      "no-empty-function": "error",
      "no-eval": "error",
      "no-fallthrough": "error",
      "no-new-wrappers": "error",
      "no-underscore-dangle": "off",
      "no-unused-expressions": "off",
      "no-unused-labels": "error",
      radix: "error",

      "header/header": [
        1,
        "block",
        [
          "!",
          " * Copyright (c) Microsoft Corporation. All rights reserved.",
          " * Licensed under the MIT License.",
          " ",
        ],
        1,
      ],
    },
  },
  {
    files: ["src/**/*.{js,ts}", "test-pages/**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
      parser: tsParser,
      parserOptions: {
        project: "tsconfig.json",
      },
    },
    plugins: {
      import: _import,
      header,
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,

      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowTernary: true,
          allowShortCircuit: true,
        },
      ],

      curly: "error",
      eqeqeq: ["error", "smart"],
      "guard-for-in": "error",
      "id-denylist": "off",
      "id-match": "off",
      "import/order": "error",
      "no-bitwise": "off",
      "no-caller": "error",
      "no-console": [
        "error",
        {
          allow: [
            "log",
            "warn",
            "dir",
            "timeLog",
            "assert",
            "clear",
            "count",
            "countReset",
            "group",
            "groupEnd",
            "table",
            "dirxml",
            "error",
            "groupCollapsed",
            "Console",
            "profile",
            "profileEnd",
            "timeStamp",
            "context",
          ],
        },
      ],
      "no-debugger": "error",
      "no-empty": "error",
      "no-empty-function": "error",
      "no-eval": "error",
      "no-fallthrough": "error",
      "no-new-wrappers": "error",
      "no-underscore-dangle": "off",
      "no-unused-expressions": "off",
      "no-unused-labels": "error",
      radix: "error",

      "header/header": [
        1,
        "block",
        [
          "!",
          " * Copyright (c) Microsoft Corporation. All rights reserved.",
          " * Licensed under the MIT License.",
          " ",
        ],
        1,
      ],
    },
  },
];
