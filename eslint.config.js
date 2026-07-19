import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/* Two source trees with different runtimes: `src` is the browser SPA, `api` is
   Vercel's Node functions. They get the same rules but different globals — a
   single browser-globals config would flag `process` in the BFF, and a Node one
   would miss `window` misuse in the app.

   Deliberately NOT type-aware (no `projectService`): the type-checked ruleset
   needs both tsconfigs wired up and roughly triples lint time, while `npm run
   build` already runs `tsc --noEmit` over the same files. This catches what the
   compiler won't — dead code, hook mistakes, floating shadowed vars. */
export default tseslint.config(
  { ignores: ["dist", "node_modules", ".vercel", ".playwright-mcp"] },

  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      /* These two are the React-Compiler-era strict rules, and they fire on
         patterns this codebase uses deliberately — PageShell writes a ref
         during render specifically to avoid a paint flash (see its comment),
         and several components clamp state when async data arrives. They're
         worth SEEING, so they stay on as warnings, but they are not defects
         and must not block a clean `npm run lint`. Revisit as a batch if the
         app ever adopts the React Compiler. */
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",

      /* Vite's Fast Refresh only works when a module exports components alone.
         The context files legitimately export their hook alongside the
         provider, which is the conventional shape — warn only. */
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      /* `_`-prefixed args are the codebase's existing convention for
         deliberately-unused params (e.g. caught errors that are swallowed). */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    files: ["api/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
