import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * One config for the whole repo.
 *
 * Tooling lives at the root so there is a single `npm run lint`, and so the
 * per-package Dockerfiles - which copy only their own directory - never see
 * any of it.
 *
 * Division of labour: Prettier owns formatting, ESLint owns correctness. The
 * `prettier` config below must stay LAST because it switches off every
 * stylistic rule that would otherwise contradict the formatter. Do not add
 * rules after it.
 */
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "**/*.d.ts"],
  },

  // Correctness baseline, not formatting.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          // A leading underscore means "deliberately unused". Express relies on
          // this: an error handler is recognised by its four-argument arity, so
          // `_next` cannot be dropped from the signature.
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  },

  /* ---- import and export sorting: whole repo ----------------------------- */
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },

  /* ---- backend: Node, and both src/ and scripts/ ------------------------- */
  {
    files: ["backend/**/*.ts"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: "module",
      },
    },
  },

  /* ---- frontend: browser + React ---------------------------------------- */
  {
    files: ["frontend/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Fires on any fetch-on-mount, which is a legitimate React pattern: the
      // rule cannot see that the setState happens after an await, so it treats a
      // session probe as a cascading render. Rewriting auth to satisfy it would
      // mean moving session state out of the provider, for no behavioural gain.
      // The derived-state mistakes this rule is best at catching are still
      // covered by `purity` and `set-state-in-render`, which stay on.
      "react-hooks/set-state-in-effect": "off",
    },
  },

  // Must be last: disables the stylistic rules Prettier already governs.
  prettier,
);
