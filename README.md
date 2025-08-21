# Supabase + Next.js (App Router) + shadcn/ui Starter Kit

A minimal, production-grade starter for building SaaS apps with Next.js App Router, React, Tailwind CSS, shadcn/ui, and Supabase Auth.

---

## Prerequisites

- Node.js 18+
- npm

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase project values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# (Optional) SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Getting Started

```bash
npm install
npm run dev
```

- Visit [http://localhost:3000](http://localhost:3000)
- The default landing page is `/signin` (Sign in / Sign up)
- After auth, you are redirected to `/app` (protected)
- Sign out returns you to `/signin`

## Auth Flow

- Uses Supabase Auth (email/password, magic link, or OAuth if enabled)
- Auth state is managed via secure cookies (SSR + client)
- `/signin` is public; `/app` and `/api/me` are protected (middleware + server guard)
- Only public keys are exposed to the client

## Adding Protected Routes & API Endpoints

- Add new protected pages under `/app/(protected)/app/`
- Add new protected API routes under `/app/api/` and update middleware if needed

## File/Folder Outline

```
/src
  /app
    /(public)
      /signin/page.tsx
    /(protected)
      /app/layout.tsx
      /app/page.tsx
    /api/health/route.ts
    /api/me/route.ts
  /components/ui/*         # shadcn/ui components
  /components/SignOutButton.tsx
  /lib/supabase/client.ts
  /lib/supabase/server.ts
  /app/globals.css
/middleware.ts
.env.example
README.md
```

## API

- `GET /api/health` → `{ ok: true }`
- `GET /api/me` → 200 with user JSON if authed, 401 if not

## References

- [Next.js App Router Docs](https://github.com/vercel/next.js/tree/canary/docs/app)
- [Tailwind CSS + Next.js](https://tailwindcss.com/docs/guides/nextjs)
- [shadcn/ui Docs](https://ui.shadcn.com/docs/installation/next)
- [Supabase Next.js Auth (with @supabase/ssr)](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/server-side/nextjs.mdx)
- [Supabase Auth Patterns](https://github.com/supabase/supabase/blob/master/examples/prompts/nextjs-supabase-auth.md)

---

## Production Notes

- No secrets in client bundle; only `NEXT_PUBLIC_*` keys are exposed
- All protected routes use middleware and/or server guards
- UI is accessible and uses shadcn/ui components

## Tech facts:
- Tailwind v4 (@tailwindcss/postcss, @tailwindcss/node)
- Do NOT install eslint-plugin-tailwindcss (v3-only)
- shadcn/ui installed per Tailwind v4


---

## License

MIT
