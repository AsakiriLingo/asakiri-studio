import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["src/**/*.{ts,tsx}"];
const typedFiles = [...sourceFiles, "vite.config.ts"];

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**", "coverage/**", "src-tauri/**"]),
  {
    name: "asakiri/javascript",
    files: ["scripts/**/*.mjs", "eslint.config.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    name: "asakiri/typescript",
    files: typedFiles,
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    name: "asakiri/react",
    files: sourceFiles,
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
  },
]);
