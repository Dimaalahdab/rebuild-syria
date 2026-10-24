# Rebuild Syria — سوريا بتتعمر فينا

Arabic-first, mobile-friendly demo for reporting neighborhood issues, analyzing
uploaded images with Gemma 4, municipality-reviewed safe projects, volunteer
applications, and municipality-confirmed impact. This is a pilot designed for
municipality partnership, not a claim of official endorsement.

## Municipality pilot

`CITY_NAME` is a public server environment setting, default `Homs / حمص`.
For bilingual values use `English / عربي`; the Arabic name is the canonical
stored city. The report form displays the localized city as read-only and keeps
neighborhood as unrestricted free text. The server also fixes the city on new
reports and AI analysis requests, so an edited client cannot choose another city.
Existing profiles and historical reports are retained without rewriting their
city, text, photos or language. Fresh demo seeds use the configured pilot city.

`/admin` is now **Municipality Dashboard / لوحة البلدية**, still protected by
`ADMIN_PIN` on every privileged API request. It includes all reports, Gemma
priority ordering, status/neighborhood filters, photos, analysis/safety flags,
status counters, pending-application totals and the average hours from report
creation to its first substantive human decision. An initial “Under review”
does not count as a decision; no decisions means the average is unavailable.

Outcomes are New, Under review, Accepted for volunteers, Assigned to municipality
team, Referred to another authority, Scheduled, Completed and Rejected. Rejection
requires a reason. Volunteer acceptance requires a date/time, creates or reuses
exactly one linked project, and opens it for applications. Professional-review,
road, structural, electrical and ordnance hazards cannot be assigned to volunteers;
both the interface and server enforce this. Only a person with the PIN decides.

New applications start Pending. Accept/Decline can include a note; duplicate
applications (including a previously declined request) are blocked. Pending and
declined applicants do not occupy accepted-volunteer places. Acceptance awards no
participation points; confirmed attendance awards 30 once. Existing joined
memberships migrate to Accepted, preserving enrollment; verified reports migrate
to Under review. No report content or photos are erased.

My account shows My reports and My volunteering, their decision/application
badges, notes and scheduled dates. Menu counters poll every ten seconds and clear
after the account activity is displayed in a visible tab. A cursor ensures that
newer concurrent updates are not accidentally marked read. No email/SMS is sent.

Before this change the working code was tagged
`checkpoint-before-municipality-2026-10-24`; the ignored SQLite backup is
`artifacts/api-server/data/checkpoints/before-municipality-dashboard.db`.

## Arabic and English

Arabic is the default, including for first-time visitors regardless of browser
language. Choose **عربي / English** in the desktop top bar or on **حسابي / My account**
on mobile. The choice is saved in localStorage (`rebuild-syria-language`).
Arabic uses `lang="ar" dir="rtl"`; English uses `lang="en" dir="ltr"`.

All product interface copy lives in `artifacts/rebuild-syria/src/i18n/ar.ts` and
`en.ts`, including validation, empty/error states, accessibility labels, metadata
and AI disclaimers. Canonical category/skill/status/role values are translated
only for display. Canonical city values retain their existing storage values.

Both AI routes accept `language: "ar" | "en"` (default `"ar"`): multipart for
`/api/analyze-issue`, JSON for `/api/match-volunteers`. New report saves also
record their content language. Switching the interface never translates or
rewrites saved reports, project descriptions, or original AI text.
Unsaved AI results are cleared on language/input changes, and late responses
for a previous language are ignored. Seeded records are labelled **Demo data**
or **بيانات تجريبية**, without overwriting their original saved descriptions.

Before this work, the working code was tagged
`checkpoint-before-english-2026-10-24`. A SQLite backup is retained locally in
the ignored `artifacts/api-server/data/checkpoints/before-english-support.db`.
These local backups are not a published-app durability guarantee.

## Run

```sh
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/rebuild-syria run dev
```

For development, run the two services in separate terminals, or use their existing Replit workflows.
The services use their configured `PORT` values and the workspace proxy routes
`/api` to Express and `/` to the website.

Server secrets:
- `GEMINI_API_KEY` — required for real Gemma analysis and recommendations.
- `ADMIN_PIN` — set this for published judging/admin access. The local demo
  fallback is `1234`; use a non-default value when publishing.

`.env.example` lists placeholders only. On Replit use Secrets; for standalone
running, supply these as environment variables. Never put the Google key in browser
code or a `VITE_` variable. This app does not automatically load a local `.env` file.

### Single-server build

```sh
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/rebuild-syria run build
pnpm --filter @workspace/api-server run build
NODE_ENV=production PORT=3000 pnpm --filter @workspace/api-server run start
```

Express serves the built website and `/api` together, on `0.0.0.0`.
The default port is 3000 when `PORT` is not provided.
The existing workspace's TypeScript and Wouter scaffolding was retained; this is
not a JavaScript-only/react-router-dom rewrite.

## Judges: 5-step test guide

1. On the home page click **جرّب كزائر تجريبي**. A volunteer demo profile is created
   immediately, without a form, with the pilot city and cleaning/organization skills.
   You land on projects. Visit `/account` and reload to see that it persists.
   Clicking the shortcut again resumes an existing valid profile instead of
   replacing it. Identity is stored in this browser's localStorage: **not secure login**.
2. At `/report`, upload JPEG/PNG/WebP up to 5 MB and describe school damage.
   The pilot city is fixed; enter any neighborhood. Ask Gemma to analyze, review
   its suggestions, and save. Failed AI analysis still allows manual saving.
3. At `/admin`, enter the PIN (demo fallback `1234`). Filter to the school report:
   volunteer acceptance must be unavailable for professional-review hazards.
   Assign it to the municipality team, add a date/time and note. Return to the
   reporter's account and check the notification, status, note and appointment.
4. Save a safe garbage/cleanup report. In the dashboard accept it for volunteers
   with a date/time; its project should appear automatically. Using a volunteer
   profile, apply from the project page: the request is Pending, not enrollment.
5. Accept the application with a note in the dashboard. Check My volunteering for
   Accepted plus its Scheduled date. Confirm attendance to award 30 points once.
   A first valid non-rejected report decision awards its author 10 points once.
   Repeat in English using the language toggle; a profile role alone never grants
   administrative access. AI recommendations never approve or enroll anybody.

Gemma's output is a preliminary suggestion, not a professional safety assessment.
Report photos are validated for type, signature and a 5 MB maximum, then saved as
SQLite BLOBs in the same transaction as the report. They are served from
`GET /api/images/:id`, never from a new file in `uploads/`.
Existing folder photos are migrated into the database at startup; old files are
left as unused backups. Missing legacy files are counted in startup warnings;
their report records are not deleted.

Seeding happens atomically only when the product database is empty. It creates
4 fictional volunteers, 3 fictional reports and 2 safe projects. Restarting a
nonempty database neither duplicates nor restores individual removed fixtures.

## Quota protection

`POST /api/analyze-issue` and `POST /api/match-volunteers` share **20 requests per
60-second window per IP**. The 21st request returns HTTP 429, an Arabic error and
`Retry-After` seconds. Rejected/invalid requests count too, before invoking Gemma.
Rate counters are stored in SQLite and survive a process restart with the same
database. Raw IPs are not stored; only SHA-256 bucket keys.

Express trusts the nearest reverse proxy for the client IP. If hosting behind a
different proxy chain, review this setting; do not trust arbitrary leftmost
forwarded addresses. Judges sharing one public IP also share its allowance.
This is not a global spend cap: many separate IPs can each make 20 requests.
Set appropriate provider-side quota limits as well.

## Municipality verification

- Live browser journeys passed in Arabic and English: school report → municipality
  assignment → reporter unread notification/account update; garbage report →
  automatic scheduled project → pending application → acceptance → account
  Accepted + Scheduled → attendance confirmation.
- All saves, decisions, applications and attendance calls used the real API and
  SQLite. Only photo analysis was intercepted with controlled AI fixtures;
  **no new live Gemma inference was tested in this workflow pass**.
- Wrong PIN returned 401. The professional-review restriction and inbox filters
  passed. Duplicate applications returned 409; pending attendance returned 400.
  Acceptance left participation points at zero; attendance awarded 30, and a
  repeated confirmation still left 30. Repeated acceptance did not duplicate a project.
- The first browser attempt found a date-binding 500. It was fixed by normalizing
  the generated validator's Date values to ISO before SQLite writes. Both resumed
  browser journeys passed, and regression tests now use parsed contract inputs.
- Isolated bilingual tests also passed rejection-reason/date requirements,
  volunteer safety blocking, decline/capacity rules, completion, notification
  cursor races, repeat-decision idempotency and preservation of original text.
- At 390×844, measured Arabic report/account and English home/account pages had
  no horizontal overflow or clipped visible button text. English admin at
  1440×1000 passed the same measurements. Arabic desktop was visually checked,
  not separately DOM-measured. The English mobile hero remains visually busy.
- Workspace typechecks and the web production build passed. A non-blocking Vite
  tooltip sourcemap warning remains. During development, one Fast Refresh warning
  reset the in-memory PIN; signing in again allowed testing to continue.
- The temporary tracked QA reports, projects, applications, images and profiles
  were removed after testing; preexisting product data was retained.

No production publishing or redeploy-durability test was performed.

## Earlier verification (before the municipality workflow)

- Browser checks passed across ten routes in Arabic and English at 390×844 and
  1440×1000, with no detected horizontal overflow or clipped actionable text.
  Authenticated admin sections were also checked in all four combinations.
- Browser request interception verified both AI request languages and rendering
  against the real responses below. Delayed prior-language analysis and matching
  responses were ignored. An English report remained unchanged after switching
  to Arabic, with its stored language still `en`.
- An initial admin wrong-PIN loading delay was fixed by disabling retries for
  the PIN check; localized error and successful PIN paths then passed.
- Four real Gemma calls passed: photo analysis and matching in both Arabic and
  English, using `gemma-4-26b-a4b-it`. Matching returned `source: gemma`, not fallback.
- Every report from the pre-language-change SQLite backup retained identical
  title, description, city, neighborhood and photo association after migration.
- New bilingual contract tests passed for Arabic defaults, both explicit
  languages, unsupported-language rejection, unchanged legacy content, content
  language metadata, demo markers and English-only canonical skill identifiers.
- Guest browser check passed: one tap starts without a form; reload preserves
  identity; a second visit reuses the same profile.
- Both preexisting folder photos migrated with identical SHA-256 checksums.
  A new browser-uploaded photo retained identical bytes after an actual API
  process restart, served from `/api/images/:id`.
- Live HTTP checks allowed 20 combined analysis/matching requests, returned 429
  plus `Retry-After` on request 21, and kept another IP's allowance separate.
  Invalid payloads were used so this test made no paid AI calls.
- Isolated SQLite checks passed for empty-only seeding, no fixture resurrection
  in nonempty databases, migration idempotency, BLOB size limits and window reset.
- README guide, example environment file, ignore rules, and canonical Apache-2.0
  license contents were checked.
- Real model listing and generation: `gemma-4-26b-a4b-it`, response `نعم`.
- Real uploaded-image request returned valid Arabic JSON; the fixture was a
  screenshot of this platform, explicitly described as a test, not a field hazard.
- Browser flow passed: profile survives refresh, edited report/image saves and
  lists, matching does not enroll, joining works, duplicate joining returns 409.
- Admin flow passed: 10 + 30 = 40 points; repeating both actions still gives 40.
- A simulated 502 analysis response showed an honest error and allowed manual saving.
- Invalid image type returns 400; over-5-MB image returns 413; unsafe project
  creation is rejected. Mobile/desktop rendering, workspace typecheck, and web
  production build passed.

These checks are in development. No production publish or redeploy durability
test was performed, and permanent local-disk persistence is not claimed.

## API / checks

- `GET /api/health` — service health
- `GET /api/healthz` — SQLite readiness and server details
- `GET /api/ai-test` — real model listing and generation (once per minute)
- `POST /api/analyze-issue` — multipart image, city, neighborhood, description
- `GET /api/images/:id` — original validated image bytes from SQLite, or 404
- `GET /api/config` — public pilot-city names
- `GET /api/admin/municipality` — PIN-protected inbox, applications and counters
- `POST /api/admin/reports/:id/decision` — human report outcome/schedule/note
- `POST /api/admin/memberships/:id/decision` — accept/decline pending applications
- `GET /api/users/:id/activity` and `/notifications` — account activity/unread counts
- `POST /api/users/:id/notifications/read` — acknowledge a displayed change cursor
- User, report, project, matching, and admin contracts: `lib/api-spec/openapi.yaml`
- Admin requests require `X-Admin-Pin`; project reads can use `X-Demo-User-Id`.

```sh
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/rebuild-syria run build
# Isolated storage, rate-window, seed, bilingual and municipal-workflow checks:
pnpm --filter @workspace/api-server test
```

The SDK is `@google/genai`. The requested model is `gemma-4-26b-a4b-it`;
startup verifies availability, with `gemma-4-31b-it` as an explicit fallback.
Requests time out after 30 seconds. Errors are surfaced honestly; failed matching
uses clearly labeled deterministic city/skill ranking.

## Publish on Replit

1. Finish the judge guide in Preview, then click **Publish** in Replit.
2. Publish the full app with its web **and API** services, not a Static-only site.
   If selecting a compute type for a single-server demo, Reserved VM is simpler
   than scaling SQLite across several instances, but it is **not persistent disk**.
3. Add `GEMINI_API_KEY` and a non-default `ADMIN_PIN` under **Production app secrets**.
   Set the public `CITY_NAME` environment value if changing the default pilot.
4. Review the generated build/run settings, choose a subdomain and click Publish.
   If manually configuring a single-server deployment, use:
   - Build: `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/rebuild-syria run build && pnpm --filter @workspace/api-server run build`
   - Run: `NODE_ENV=production pnpm --filter @workspace/api-server run start`
   Express listens on the deployment's `PORT` and serves both the built site and API.
5. Open the published URL, check `/api/health`, click the guest button, and repeat
   the judge guide. A new empty deployment seeds its own demo data automatically.

### Which Replit deployment keeps the SQLite file?

**None guarantees durable local SQLite storage.** According to Replit's current
documentation, local disk on both Autoscale and Reserved VM is not persistent
across published-app restarts/republishing. Static publishing cannot run the API.

The app uses `artifacts/api-server/data/app.db`, now containing both reports and
image BLOBs. A normal application-process restart with this same file preserves
the photos; replacing or losing the file loses reports and photos together.
Moving photos into BLOBs does **not** make ephemeral deployment storage durable.
Development data is excluded from deployment, intentionally; each fresh demo seeds.

For durable production data, use a supported persistent database service or host
SQLite on a server with an explicitly persistent volume and backups. This project
has **not** been migrated to another database; that requires the owner's approval.

Official publishing guide: https://docs.replit.com/features/publishing/overview
Deployment types: https://docs.replit.com/features/publishing/deployment-types
Persistence troubleshooting: https://docs.replit.com/build/troubleshooting

## License and repository hygiene

Apache-2.0; see `LICENSE`. Dependencies keep their own licenses.
`.gitignore` excludes `node_modules`, `data/`, `.env` and other local secret files;
`.env.example` is intentionally tracked and contains no working credentials.
