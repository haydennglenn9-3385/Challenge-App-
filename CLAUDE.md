# Challenge App — CLAUDE.md

## Project Overview
A community fitness challenge platform ("Q&A Fitness") with team competitions, streaks, daily check-ins, and real-time messaging.

## Stack
- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — PostgreSQL + Auth + Row-Level Security
- **Vercel** — deployment target

## Running the App
```bash
npm run dev    # http://localhost:3000
npm run build
npm start
```

Requires `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Key Directories
| Path | Purpose |
|------|---------|
| `app/embed/` | All protected (logged-in) pages |
| `app/api/` | API routes |
| `app/actions/` | Server actions |
| `lib/storage.ts` | Central DB layer — all Supabase queries go here |
| `lib/scoring/` | Points, streaks, team score logic |
| `lib/utils/` | Shared formatting/time/points helpers |
| `components/` | Reusable UI components |

## Architecture Patterns
- **DB access**: Always through `lib/storage.ts`. Don't write raw Supabase queries in pages/components.
- **Auth**: Supabase Auth + `UserContext` (`lib/UserContext.tsx`). Protected routes live under `/embed/`.
- **Admin operations**: Use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Client-side code uses anon key only.
- **Strict mode**: TypeScript strict mode is **off** (`strict: false` in tsconfig).
- **Path alias**: `@/` maps to project root.

## Route Structure
- `/` — public landing
- `/auth` — login/signup
- `/embed/*` — protected app (requires session)
- `/embed/admin` — admin-only (role check in component)
- `/embed/challenge/[id]` — dynamic challenge detail/edit

## Scoring System
See memory file `project_scoring_model.md` for full details. Key constants:
- `GLOBAL_POINTS_PER_CHECKIN = 5`
- Streak milestone bonuses at 7, 14, 21, 30, 60, 100 days
- Team scoring supports 4 aggregation methods: total, average, highest, median

## No Tests
There is no test suite. No Jest, Vitest, or test files exist.

## Styling
- Tailwind CSS for most styles
- Inline styles used for animations (gradient orbs, particles, dynamic colors)
- Fonts: Bricolage Grotesque (display) + DM Sans (body)
- Custom globals in `app/globals.css`
