# Supabase + Next.js (App Router) + Tailwind v4 + shadcn/ui — Org Starter

A minimal, production-grade starter for SaaS apps with **Auth**, **Organizations & Roles (RLS)**, and **Invite-by-Email** out of the box.

* Framework: **Next.js App Router** (v15+)
* UI: **React**, **Tailwind v4**, **shadcn/ui**
* Auth/DB: **Supabase** (`@supabase/ssr`, RLS policies)
* Multi-tenant: orgs + admin/member roles
* Invites: admin creates link → invitee signs in → auto-joins org

---

## Features

* **Auth flow**

  * `/signin` (public) with tabs (Sign in / Sign up)
  * Remembers `?next=` and redirects after auth
  * `/app` (protected) shows user email, orgs list, admin-only invite UI
* **Organizations & Roles**

  * Tables: `organizations`, `organization_members`, `profiles`
  * Helpers: `is_org_member(uuid)`, `is_org_admin(uuid)` (**security definer**)
  * RLS: members can read/write their org; admins can manage members
* **Invites**

  * Table: `org_invites`
  * RPCs: `create_org_invite(org_id, email, role, expires_at?)`, `accept_org_invite(token)`
  * Endpoints/Pages:

    * `POST /api/invites` → returns `joinUrl` (`/join/:token`)
    * `GET /join/[token]` → accepts invite then redirects to `/app`
* **Admin-only UI**

  * Invite form only visible to admins (also enforced server-side and in RPC)
* **Production-sane defaults**

  * Only `NEXT_PUBLIC_*` keys in client
  * SSR & Route Handlers use **async `cookies()`** pattern (Next 15)
  * Tailwind v4; **no** `eslint-plugin-tailwindcss` (v3-only)

---

## Prerequisites

* Node.js 18+
* npm
* Supabase project (URL + anon key)

---

## Environment Variables

Copy `.env.example` → `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` is used to build invite links (join URLs).

---

## Quick Start

```bash
npm install
npm run dev
# open http://localhost:3000
```

Test flow:

1. Visit `/signin` → Sign up or Sign in
2. You’ll be redirected to `/app` (protected)
3. Create an organization (NewOrgForm)
4. Invite a member (admin only) → copy invite link
5. Open invite link in a private window → sign up/sign in → auto-joins org → lands on `/app`

---

## Project Structure

```
/src
  /app
    /(public)
      /signin/page.tsx         # tabs + next-param handling + emailRedirectTo
    /(protected)
      /app/layout.tsx          # server guard; redirects to /signin if not authed
      /app/page.tsx            # hello world + orgs list + admin-only Invite UI
    /api/health/route.ts
    /api/me/route.ts
    /api/orgs/route.ts         # list/create org (RPC)
    /api/invites/route.ts      # create invite (admin-only, returns joinUrl)
    /join/[token]/page.tsx     # await params; accept invite; redirect /app
  /components
    /ui/*                      # shadcn/ui components
    InviteMemberForm.tsx
    NewOrgForm.tsx
    SignOutButton.tsx
  /lib/supabase
    client.ts                  # browser client (createBrowserClient)
    server.ts                  # server client (await cookies(), getAll/setAll)
  /app/globals.css
/middleware.ts                 # (optional) extra guard; layout already protects
.env.example
components.json                # shadcn config
```

---

## Supabase Schema (summary)

* `organizations(id, name, created_by, created_at)`
* `profiles(id ↦ auth.users, display_name, created_at)`

  * Trigger `on_auth_user_created` → `handle_new_user()`
* `organization_members(org_id, user_id, role 'admin'|'member', invited_by, created_at)`

  * **RLS:** members read/insert; admins update/delete
* Helpers (**security definer**):

  * `is_org_member(org_id) → boolean`
  * `is_org_admin(org_id) → boolean`
* RPCs:

  * `create_org_with_admin(name) → org_id`
  * `create_org_invite(org_id, email, role?, expires_at?) → token`
  * `accept_org_invite(token) → org_id`
* `org_invites(token, org_id, email, role, invited_by, created_at, expires_at, accepted_at)`

  * **RLS:** admins of that org can read

> Policy recursion was avoided by using **security-definer** helpers inside policies (no self-joins in `USING`).

---

## API Endpoints

* `GET /api/health` → `200 { ok: true }`
* `GET /api/me` → `200` with user JSON (authed) / `401` otherwise
* `GET /api/orgs` → list my orgs
* `POST /api/orgs` → `{ id }` (calls `create_org_with_admin`)
* `POST /api/invites` → `{ token, joinUrl }` (admin-only; calls `create_org_invite`)

---

## Auth, Invites & Redirects

* **Join link**: `/join/:token`

  * If not signed in → redirects to `/signin?next=/join/:token`
  * `/signin` stores `next` in `localStorage`
  * After login/confirmation, it redirects back to `next`
  * `/join/:token` runs `accept_org_invite(token)` then redirects to `/app`

**Next 15 notes**

* `cookies()` is async in Route Handlers / some server contexts → `createClient()` in `server.ts` is **async** and awaits `cookies()` once, then exposes **sync** `getAll/setAll` to `@supabase/ssr`.
* Always **`await createClient()`** in layouts, server components, and route handlers.
* Dynamic route `params` may be async → in `/join/[token]/page.tsx` we **`await params`**.

---

## Admin-only Invite UI

* Backend: `POST /api/invites` checks membership/role before calling RPC; RPC also checks `is_org_admin`.
* Frontend: Invite form renders only for orgs where the user is **admin**.

---

## Dev Tips / Cline Notes

* **Tailwind v4** (`@tailwindcss/postcss`, `@tailwindcss/node`)
  **Do NOT** add `eslint-plugin-tailwindcss` (requires Tailwind v3).
* Use `@supabase/ssr` helpers for Next.js App Router.
* Path alias: `@/*` → `./src/*` (see `tsconfig`).
* Add more shadcn components as needed:

  ```bash
  npx shadcn@latest add <component>
  ```

---

## Supabase CLI (migrations)

For a **new project** created from this template:

```bash
# Link to your Supabase project
supabase link --project-ref <YOUR-REF>

# Apply existing migrations from this repo
supabase db push
```

Capture changes you make via SQL Editor:

```bash
# Generate a baseline diff from remote → creates a migration file
supabase db diff -f 20YYMMDD_init_orgs_roles_invites --schema public,auth

git add -A
git commit -m "chore(db): baseline orgs+roles+invites"
git push
```

Local stack (optional):

```bash
supabase db reset   # spin local DB and apply migrations
```

---

## Roadmap / Extending

* Org switcher UI & `/app/[orgId]` routes (scope pages/queries by org)
* First CRM table (e.g., `leads`) following the same RLS pattern:

  * include `org_id`, `created_by`, timestamps
  * read: members; write: members; update/delete: admin or owner
* Webhooks / background jobs via Route Handlers or edge functions
* Role variants (viewer, billing\_admin) or per-feature permissions

---

## License

MIT
