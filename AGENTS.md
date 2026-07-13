# Repository Guidelines

## Project Structure & Module Organization

Tide is a Vue 3 and TypeScript frontend for the qBittorrent Web API. Application code lives in `src/`: API requests are grouped under `src/api/modules/`, screens live in `src/views/`, reusable UI is split between `src/components/layout/` and `src/components/torrent/`, and shared state uses Pinia stores in `src/stores/`. Put reusable behavior in `src/composables/`, domain types in `src/types/`, and helpers in `src/utils/`. Global styles are in `src/assets/main.css`; static files belong in `public/`. Do not edit generated `dist/` or declaration files manually.

## Build, Test, and Development Commands

- `bun install` installs dependencies from `bun.lock`.
- `bun dev` starts the Vite development server.
- `bun run build` runs `vue-tsc` and creates a production bundle.
- `bun run preview` serves the production build locally.
- `bun run type-check` checks Vue and TypeScript types without bundling.
- `bun lint` runs Oxlint and ESLint with automatic fixes.
- `bun run format` formats files under `src/` with Oxfmt.

Set `VITE_QB_HOST=http://127.0.0.1:8080` in a local `.env` to proxy `/api` requests to qBittorrent during development.

## Coding Style & Naming Conventions

Use two-space indentation, LF endings, UTF-8, and a 100-character line target. Oxfmt enforces single quotes and no semicolons. Prefer Vue Composition API with `<script setup lang="ts">`. Name components and views in PascalCase (`DetailDrawer.vue`), composables with a `use` prefix (`usePolling.ts`), stores by domain (`torrentList.ts`), and functions/variables in camelCase. Use the `@/` alias for imports from `src/`. Keep API calls in modules rather than constructing requests inside components.

## Testing Guidelines

No automated test runner is configured. Before submitting changes, run `bun run type-check`, `bun lint`, and `bun run build`, then manually verify affected flows against a qBittorrent instance. If introducing tests, prefer Vitest and name files `*.spec.ts` or place them in a nearby `__tests__/` directory; add the corresponding script to `package.json`.

## Commit & Pull Request Guidelines

History primarily uses concise Conventional Commit messages, usually in Chinese, such as `feat: 增加统计概览页面` or scoped forms like `feat(AppSidebar): 改进导航逻辑`. Use `feat:`, `fix:`, `refactor:`, or `docs:` with an imperative summary. Pull requests should explain the user-visible change, list validation commands, link related issues, and include screenshots for UI changes. Keep generated files, `.env`, `.qb-data/`, and unrelated formatting changes out of commits.

## Security & Configuration

Never commit qBittorrent credentials, session cookies, local server addresses, or `.env` contents. Preserve the proxy header rewriting in `vite.config.ts`, which supports qBittorrent CSRF checks.
