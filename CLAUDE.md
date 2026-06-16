# Challenge App — CLAUDE.md

## Project Overview
A community fitness challenge platform ("Q&A Fitness") for Queers & Allies Fitness. Features team competitions, streaks, daily check-ins, and real-time messaging. Audience: general public + queer-affirming fitness community.

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
| `app/actions/` | Server actions — preferred pattern for mutations |
| `lib/storage.ts` | Legacy DB layer — exists but largely bypassed; don't add to it |
| `lib/scoring/` | Points, streaks, team score logic |
| `lib/utils/` | Shared formatting/time/points helpers |
| `components/` | Reusable UI components |
| `docs/` | Architecture and audit docs |

## Architecture Patterns

### DB access
Pages and components query Supabase directly using the browser client (`lib/supabase/client.ts`). `lib/storage.ts` is documented as the central layer but isn't followed — don't add new queries there.

**For mutations and sensitive reads, use server actions** (see `app/actions/`). Server actions run server-side, can use the service-role client (`SUPABASE_SERVICE_ROLE_KEY`), and verify auth before acting.

### Auth
- Supabase Auth + `UserContext` (`lib/UserContext.tsx`) — provides `user`, `isLoading`, `needsOnboarding`
- Protected routes live under `/embed/` — `AuthGuard` in `embed/layout.tsx` redirects unauthenticated users to `/auth`
- Server actions must verify the caller's session using `createServerClient` from `@supabase/ssr` before performing any write

### Admin operations
- Always use a server action or API route that (1) verifies `role === 'admin'` from the authenticated session, then (2) uses `supabaseAdmin` (service role) for the actual write
- Pattern: see `app/actions/updateMemberStats.ts` and `app/api/admin/update-user/route.ts`
- **Never** perform admin mutations from the browser client — even if RLS appears to allow it

### Join codes
- Join codes for private challenges must **never be returned to the client**
- Validate codes server-side only via `app/actions/validateJoinCode.ts`

### Check-in state
- Check-in state (checkedIn, loading, streak) lives in `CheckInContext` in `embed/layout.tsx`
- Both `BottomNav` and `Sidebar` consume the context — do not add separate `getCheckinStatus()` calls

### Team membership
Two tables must stay in sync: `challenge_members.team_id` (source of truth) and `team_members` (legacy, used by messages page for team chat access). Any code path that assigns a user to a team must update both.

## Route Structure
- `/` — public landing
- `/auth` — login/signup
- `/auth/reset` — password reset
- `/join` — public join-with-code landing
- `/embed/*` — protected app (requires session, enforced by AuthGuard)
- `/embed/admin` — admin-only (role check in component + server action)
- `/embed/challenge/[id]` — dynamic challenge detail/check-in/leaderboard/chat
- `/embed/challenge/[id]/manage` — creator/admin only

## Scoring System
Key constants (in `app/actions/dailyCheckin.ts`):
- `GLOBAL_POINTS = 5` per daily check-in
- Streak milestone bonuses: 7d → +25, 14d → +15, 21d → +20, 30d → +100, 60d → +75, 100d → +500
- Team scoring supports 4 aggregation methods: total, average, highest, median (see `lib/scoring/`)

## Known Open Issues
See `docs/AUDIT-2026-06-15.md` for the full list. Key open items:

1. **`handleReact` race condition** (`dashboard/page.tsx`) — concurrent reactions can overwrite each other. Needs atomic Supabase RPC.
2. **`team_members` sync gap** — `joinChallenge` in `lib/storage.ts` skips `team_members` write, breaking team chat for those users.
3. **`handlePost` user_name from client state** — activity feed posts should resolve display name server-side.
4. **Streak calendar shows repair days as check-ins** — calendar should query `daily_logs` not `activity_feed`.
5. **`createUserProfile` IDOR** — doesn't verify caller owns the target user ID.

## No Tests
There is no test suite. No Jest, Vitest, or test files exist.

## Styling
- Tailwind CSS for most styles
- Inline styles used for animations (gradient orbs, particles, dynamic colors)
- Fonts: Bricolage Grotesque (display) + DM Sans (body)
- Custom globals in `app/globals.css`
- Language should be inclusive and gender-neutral throughout
