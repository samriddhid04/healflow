import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import react from "eslint-plugin-react";
import globals from "globals";

export default [
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      "react": react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // React 17+ JSX transform — no need to import React in scope
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      // Mark JSX variables as used so ESLint doesn't flag components
      "react/jsx-uses-vars": "error",

      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Only flag truly unused non-component vars
      "no-unused-vars": ["warn", {
        "varsIgnorePattern": "^(React|_)",
        "argsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],

      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error",
    },
  },
];