# 363 Cooperative Society — Member Dashboard (Frontend)

A React + Vite frontend for the 363 Cooperative Society member platform.
**Registration and login are now wired to the real backend** (see the
companion `363-cooperative-backend` project — email/password + email 2FA,
JWT-based). Everything past login (balance, contributions, transactions)
is still mock data, since the backend doesn't have those endpoints yet.

## Getting started

```bash
cp .env.example .env     # point VITE_API_URL at your running backend
npm install
npm run dev
```

You need the backend running (see its own README) for registration/login to
work — this app has no built-in fallback/mock auth anymore.

## Brand

Navy (`#0A0A6E`) + orange (`#FF6600`), pulled directly from the 363
Resources logo — navy for trust/structure (dark surfaces, headings), orange
for the action color (buttons, links, active nav), matching the site's own
CTA button. All of it lives as CSS custom properties in `src/index.css`, so
further brand tweaks are a few variable edits, not a hunt through every
component file. Fonts are Manrope (numbers/headings) and Inter (body text).

## What's here

- **`src/api/client.js`** — thin `fetch` wrapper around the backend's
  `/api/auth/*` routes. Set `VITE_API_URL` in `.env` to point it at the
  right backend (local, staging, Render).
- **`src/context/AuthContext.jsx`** — real session state. Holds **no token
  of any kind** — access, refresh, and the short-lived 2FA-pending token
  all live in httpOnly cookies set by the backend, invisible to this code
  on purpose (closes off token theft via XSS). The only client state is the
  signed-in user's profile, kept in memory and re-derived from `/auth/me`
  on every load — a hard refresh calls `/me`, and if the access cookie's
  expired, silently calls `/refresh` once before giving up.
- **`src/pages/`** — `Register` → `VerifyEmail` → `Login` → `LoginVerify`
  (the real auth flow), then `Dashboard`, `Deposit`, `Withdraw`,
  `Transactions`, `Profile` (still mock data — see below).
- **`src/components/OtpInput.jsx`** — shared 6-digit code input, used by
  both `VerifyEmail` and `LoginVerify`.
- **`src/data/mockData.js`** — sample balance/contribution/transaction data
  for everything past login.
- **`src/seo/usePageMeta.js`** — see SEO section below.

## Auth flow (matches the backend exactly)

1. **Register** → `POST /auth/register` → redirected to **Verify email**.
2. **Verify email** → 6-digit code → `POST /auth/verify-email` → redirected
   to **Login**.
3. **Login** → email + password → `POST /auth/login` → backend emails a
   second 6-digit code and returns a short-lived `pendingTwoFactorToken` →
   redirected to **Confirm it's you**.
4. **Confirm it's you** → 6-digit code + that pending token →
   `POST /auth/login/verify-otp` (cookie sent automatically, nothing to
   pass manually) → backend sets `access_token` + `refresh_token` httpOnly
   cookies → into the dashboard.

Both OTP screens share one `OtpInput` component and support resend (which
invalidates the previous code server-side — see the backend README).

## Auth cookies, not localStorage

Every request in `src/api/client.js` sends `credentials: "include"` — this
is what makes the browser attach/accept the backend's httpOnly cookies on
cross-origin requests (different port in dev, different domain in prod).
Without it, login would appear to succeed but nothing would stay signed in.

For this to work, the backend's `CLIENT_ORIGIN` env var must match this
app's exact origin (CORS requires an exact origin, not `*`, when
`credentials: true` is set). If login seems to silently fail — a 200
response but `/me` still says signed out — that mismatch is the first
thing to check.

## SEO

This is a signed-in member portal, not a marketing site, so the default
posture is **noindex everywhere except the public routes**:

- `index.html` carries static title/description/OG tags as the crawler-visible
  fallback (most crawlers don't execute JS).
- `src/seo/usePageMeta.js` is a `usePageMeta({ title, description, indexable })`
  hook called at the top of every page. `indexable` defaults to `false`
  (noindex) — only `Login` and `Register` pass `indexable: true`.
- `public/robots.txt` and `public/sitemap.xml` only list the public routes
  (home/login/register); everything else is disallowed.

Worth knowing: `usePageMeta` updates `document.title`/meta tags client-side,
which is enough for browser tabs and in-app link previews, but it is **not**
real SSR — a crawler that doesn't run JS still only sees what's in
`index.html`. If the public marketing pages ever need to actually rank in
search, prerender those specific routes rather than relying on this hook.
As more pages get built, give each one its own `usePageMeta` call rather
than letting them inherit a neighboring page's title.

## KYC, deposits, and the admin side (real now)

- **`src/pages/Kyc.jsx`** — the member-facing KYC form (account number,
  bank, address, two file uploads) plus the three states it can be in:
  awaiting review, declined (with the admin's reason, and a resubmit
  form), or approved. Submits as `multipart/form-data` via
  `api.kyc.submit`.
- **`src/pages/Deposit.jsx`** → `api.deposits.initialize` opens a Paystack
  checkout (`window.location.href = authorizationUrl`) → Paystack redirects
  to **`src/pages/DepositCallback.jsx`** (`/deposit/callback`, outside the
  sidebar layout since it's mid-flow) → that page reads `?reference=` and
  calls `api.deposits.verify`, which is where the backend actually confirms
  payment with Paystack server-side.
- **`src/pages/Withdraw.jsx`** — gated on an **approved** KYC submission
  (withdrawals only pay out to that verified account, so the page shows a
  "complete your KYC" prompt instead of a form if it isn't approved yet).
  `api.withdrawals.initiate` → OTP step (same `OtpInput` component as
  KYC/login) → `api.withdrawals.confirm`. No token passed between the two
  calls — the pending-withdrawal cookie the backend set on `initiate` is
  sent automatically by the browser on `confirm`.
- **`src/pages/Transactions.jsx`** and the Dashboard's "Recent activity"
  card both now show **real, merged** deposit + withdrawal history —
  fetched from `api.deposits.listMine()` and `api.withdrawals.listMine()`
  in parallel, combined, and sorted by date client-side (no merged backend
  endpoint; two calls, one array). `src/data/statusMeta.js` is the single
  place every status pill's label/color is defined, shared by `Deposit`,
  `Withdraw`, `Transactions`, and `TransactionRow` — so a status never
  reads differently depending on which page you're looking at it from.
- **`src/pages/Dashboard.jsx`** shows real `bookBalance` /
  `availableBalance` from `/auth/me` and a KYC-status banner (prompts
  completion, shows a decline reason, or disappears once approved).
- **`src/pages/BusinessFinanceFacility.jsx`** — one page that moves
  through states depending on the member's situation: no application yet
  → **eligibility check** (shows each check as pass/fail plus a
  "preliminarily eligible" verdict — business purpose is listed as
  "assessed once you apply", matching how the backend treats it) →
  **application form** → **document checklist** (identity isn't re-asked
  for a member with approved KYC, only facility-specific docs) → status
  card while under review. If an officer requests more information, it
  shows their request alongside the same document-upload checklist;
  uploading flips the application back into review automatically. Once
  approved it shows the offered terms (which may differ from what was
  requested). Application history sits below throughout. Declined
  applications don't block starting a new one.
- **`src/pages/admin/`** — a second, separate area at `/admin`, `/admin/kyc`,
  `/admin/deposits`, `/admin/withdrawals`, `/admin/finance-facilities`,
  gated by `user.role === "admin"` in `src/components/AdminLayout.jsx`
  (redirects a signed-in non-admin to `/`, not to login — they're
  authenticated, just not allowed here). The finance facility area has a
  queue page and a detail/review page
  (`AdminFinanceFacilityDetail.jsx`): request details, account analysis
  (membership, deposit/withdrawal metrics), KYC summary with links to
  view the member's KYC documents, the application's own documents, then
  the decision — request more information, decline with a reason, or
  approve with terms (amount defaults to what was requested but is
  editable, since officers can counter-offer). Document previews are
  fetched as a blob with credentials and opened via
  `URL.createObjectURL` rather than linked directly, so viewing one still
  goes through the normal cookie-authenticated request.
- There's no UI to become an admin — see the backend README for how to
  promote an account by hand. Makes sense: an "become admin" button is a
  privilege-escalation surface this project doesn't need.

## Still mock, pending the next backend phase

The change-password form is still local state — no backend endpoint for
it yet. Finance facility offer acceptance, agreement signing,
disbursement, the active-facility/repayment-schedule view, and appeals
come next (the member page already shows the approved terms, but says
plainly that the next steps aren't built yet rather than pretending).
Search the codebase for `// Would call` and `// Replace with` to find
what's left.

## Stack

React 18 · Vite · React Router · lucide-react icons. No CSS framework —
hand-written CSS with design tokens in `src/index.css`.
