# Project Guidelines

## Project Overview

**A4 Document Position Editor** — a browser tool for placing and managing labeled coordinate points on A4-sized (210×297 mm) documents. Users upload scanned forms/certificates, click to place markers, and export positions as JSON for use in printing pipelines.

Key features: image upload, drag-to-reposition markers, mm-precision inputs, JSON import/export, URL-based state sharing (base64 query param), and Thai-language print support.

## Architecture

- **Single-component app**: almost all logic lives in `src/App.vue` (~1130 lines). Extract to composables or components only when logic is clearly reusable.
- `src/components/CustomDialog.vue` — thin `<dialog>` wrapper (props: `isConfirmAutoClose`, `confirmText`, `cancelText`, `hideConfirm`, `hideCancel`, `classes`; emits: `confirm`, `cancel`).
- `src/composables/print.ts` — Thai text helpers (`isThaiChar`, `splitToCharSpans`) and print composables (`usePrint`, `useDetectPrint`).
- No router, no state management library (Pinia/Vuex), no UI component library.
- Deployment: GitHub Pages via `.github/workflows/main.yml`; `BASE_URL` injected as a GitHub Actions secret.

### Core Data Model

```ts
interface Position {
  no: string | number  // label/index
  name: string
  xMM: number          // X offset in millimeters from left edge
  yMM: number          // Y offset in millimeters from top edge
  value?: string       // optional display text
}
```

Always work in millimeters for coordinates. The A4 canvas is 210 × 297 mm.

## Build and Dev

```bash
npm run dev       # dev server at http://localhost:5454
npm run build     # vue-tsc type-check + Vite bundle → /dist
npm run preview   # serve /dist locally
npm run lint      # ESLint with auto-fix
npm run clean     # rm -rf node_modules dist package-lock.json
```

No test framework is configured.

## Code Style

- **Vue 3 Composition API** with `<script setup lang="ts">` only — no Options API.
- **ESLint** (`@antfu/eslint-config`, flat config) handles all formatting — no Prettier.
- `alert()` and `confirm()` are permitted (`no-alert: off`).
- ESLint auto-fixes on save (configured in `.vscode/settings.json`).
- TypeScript strict mode is on; `noUnusedLocals/Parameters` is off.

## Conventions

- **Thai text** rendering: use `splitToCharSpans(text)` from `src/composables/print.ts` to split text into `{char, isThai}[]` for correct character-level CSS in print output.
- **Coordinate display**: always label variables and props with the `MM` suffix when storing millimeter values (e.g., `xMM`, `yMM`, `a4WidthMm`).
- **Fonts**: Angsana New (Thai) served from `public/fonts/`; Open Sans loaded from Google Fonts in `index.html`.
- **URL state**: position list is serialized as base64 JSON in the `data` query parameter.
- `legacy-peer-deps=true` is set in `.npmrc` — use `npm install`, not `yarn` or `pnpm`.
