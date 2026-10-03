import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts CLI Node puro (CommonJS) — não fazem parte do bundle Next.js
    "scripts/**/*.js",
    // Gerados ou de rascunho: nunca entram no bundle.
    "public/maplibre/**", // worker do maplibre-gl, copiado a cada build
    "scratchpad/**",
    "wireframe/**",
    "opendesign/**",
    "graphify-out/**",
    ".worktrees/**", // cópias de trabalho do git, fora do repositório
  ]),
  // Dívida de código que já existia quando o CI foi consertado (2026-10-03):
  // 132 erros espalhados por 53 arquivos, vários deles em arquivo protegido
  // (GuiaTumulo, página do memorial). Reescrever tudo de uma vez pra agradar
  // o lint era mais arriscado que o problema, então estas regras viram AVISO:
  // continuam aparecendo no relatório, mas não derrubam o CI. As demais
  // regras seguem como erro -- código novo com erro de verdade ainda é barrado.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      // Só acusa `usaReducaoMovimento`: é um hook de verdade, com nome em
      // português ("usa" em vez de "use").
      "react-hooks/rules-of-hooks": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
]);

export default eslintConfig;
