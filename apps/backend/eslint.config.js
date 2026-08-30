// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "migrations/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Hexagonal boundary: domain/ must stay framework- and infra-agnostic.
    files: ["src/modules/*/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infrastructure/**", "**/infrastructure"],
              message:
                "domain/ must not import from infrastructure/ (hexagonal boundary violation).",
            },
            {
              group: ["**/application/**", "**/application"],
              message:
                "domain/ must not import from application/ (hexagonal boundary violation).",
            },
            {
              group: ["express", "kysely", "pg"],
              message:
                "domain/ must not depend on HTTP or persistence frameworks directly.",
            },
          ],
        },
      ],
    },
  },
  {
    // application/ may depend on domain/ ports, but not on concrete infrastructure.
    files: ["src/modules/*/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infrastructure/**", "**/infrastructure"],
              message:
                "application/ must depend on domain/ ports, not on infrastructure/ adapters directly (hexagonal boundary violation).",
            },
          ],
        },
      ],
    },
  },
);
