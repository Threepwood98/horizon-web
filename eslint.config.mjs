import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-build/**",
    ".next-fresh/**",
    ".agents/**",
    ".claude/**",
    ".cursor/**",
    ".devin/**",
    ".prisma-composer/**",
    "out/**",
    "build/**",
    "prisma/migrations/**",
    "src/generated/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
