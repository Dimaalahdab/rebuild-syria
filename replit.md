# Rebuild Syria

Arabic-default bilingual community reporting and safe-volunteering demo (Arabic RTL, English LTR). See README.md for operation, API, testing, and publishing instructions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on managed `PORT` (standalone default 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required server secret: `GEMINI_API_KEY`; optional `ADMIN_PIN` (demo default 1234).
- Public environment: `CITY_NAME`, default `Homs / حمص`. New reports and analysis are fixed to this one pilot city; any neighborhood is valid free text.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Product DB: SQLite via better-sqlite3. The unused template Postgres package is not the product's store.
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle), Vite

## Where things live

- Product UI: `artifacts/rebuild-syria`
- API, SQLite, uploads, Gemma service: `artifacts/api-server`
- API contract: `lib/api-spec/openapi.yaml`; regenerate clients and schemas after editing it.

## Architecture decisions

- Keep the existing monorepo scaffolding while implementing the requested product.
- The original brief requests JavaScript/react-router-dom; the existing TypeScript/Wouter scaffold was retained, an acknowledged technical deviation.
- Keep report images as SQLite BLOBs (max 5 MB) with the report transaction; no new folder uploads. This is the owner's requested storage approach.
- BLOBs preserve photos only while the same SQLite file survives. No Replit local-disk deployment is a durable production database.

## Product

Profiles, image reports, real Gemma analysis, safe volunteer projects, recommendations, PIN-protected Municipality Dashboard, volunteer applications, account status updates and unique impact awards. Judges must be able to start with a one-tap guest profile without filling a form.

## User preferences

- Use SQLite persistence, not PostgreSQL; do not replace the database without permission.
- Demo identity only: no email, phone, passwords, or real authentication.
- Arabic-first, mobile-first, RTL; use Arabic skill labels with canonical English skill values.
- English support must preserve Arabic as the default. Persist the chosen interface language, localize every product screen, and never rewrite saved report text when toggling languages.
- Send the selected language to both Gemma routes. Keep categories and skills in English internally; translate labels only for display.
- Never open hazardous road, building, electrical, or ordnance work for volunteers.
- AI neither approves projects nor enrolls people. Its safety notes are not professional certification.
- The pilot is designed for municipality partnership. Never claim that any municipality has actually endorsed this project.
- Municipality acceptance automatically creates/reuses a scheduled volunteer project. Applying starts Pending; only a human can accept/decline, and participation points require confirmed attendance.
- Keep municipality status updates inside the account/menu; no email or SMS.

## Gotchas

- Replit injects `PORT` and `BASE_PATH` for the frontend workflow/build; manual frontend builds need these values.
- Publishing must have production secrets configured separately. Do not publish local development data.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
