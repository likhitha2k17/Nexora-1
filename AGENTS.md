<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Current backend architecture
- Node.js 24 local backend in backend/, SQLite workspace and scan history in data/.
- src/lib/backend.ts is the HTTP service layer; src/lib/store.tsx synchronizes the workspace with revision conflict checks.
- Google Play requests use Scrappa server-side only. Never expose keys in VITE_* variables.
- src/lib/risk.ts is shared by frontend and backend for consistent scoring.
- Run npm run test:backend, npx tsc --noEmit, and npm run build for backend changes.
- Local single-user build; add authentication and deployment routing before internet hosting.

## Original frontend architecture (historical)
- All demo data lives in src/lib/demo-data.ts and flows through the single StoreProvider (src/lib/store.tsx, persisted to localStorage) — so every page and chart reads one consistent dataset.
- Risk scores are computed only in src/lib/risk.ts — keeps the "demo heuristic" consistent everywhere.
- Future backend calls go through src/lib/services.ts — UI never fakes external calls directly.
- Dashboard pages live under the pathless `_dash` layout (sidebar + header); the landing page and print report sit outside it.
