# LendLoop

Borrow what you need. Lend what you don’t.

A neighborhood tool library built with Next.js App Router, TypeScript, Clerk, Convex and self-hosted n8n. The public page has a searchable, category-filtered catalog; configured deployments read it from Convex. Without credentials, the app displays clearly labeled sample tools and explains setup when sign-in is selected. Demo mode never grants authentication or writes fake loans.

## Run locally

Requires Node 22.18+ (Node 24 recommended), npm, Docker, a Clerk application and a Convex account.

1. `npm ci` and `cp .env.example .env.local`.
2. Run `npx convex dev`, select/create a development deployment, and retain the URL it writes to `.env.local`. Convex regenerates the checked-in bootstrap `_generated` modules with fully typed bindings.
3. In Clerk, create a JWT template named `convex` with audience `convex`. Copy its issuer domain into the Convex environment. Add your Clerk publishable and secret keys to `.env.local`. Configure allowed localhost origins in Clerk.
4. Set backend variables using `npx convex env set NAME VALUE` (or the Convex dashboard): `CLERK_JWT_ISSUER_DOMAIN`, `ADMIN_SUBJECTS` (comma-separated Clerk user IDs, no spaces), `AUTOMATION_SECRET`, `N8N_WEBHOOK_URL`. Admin membership is managed only by deployment operators; clients cannot promote themselves. Set variables before the initial deployment if auth config validation requires them.
5. Run `npm run dev`; open http://localhost:3000. Sign in using two separate Clerk accounts to exercise lending and borrowing. New deployments start with an empty catalog; add a listing as the first account.
6. Generate **different** random values for `AUTOMATION_SECRET` and `N8N_ENCRYPTION_KEY`, e.g. `openssl rand -hex 32`. For Docker create an untracked `.env` containing these plus `CONVEX_SITE_URL=https://YOUR-DEPLOYMENT.convex.site`. Use the identical automation secret in Convex and Docker. `.env.local` is for Next.js; Compose reads `.env`.
7. `docker compose up -d`. Open http://localhost:5678, create the owner account, import `n8n/errors.json` first, then the two other workflows. In each main workflow’s settings select the imported error workflow (replace the placeholder ID). Activate both main workflows; schedule uses `GENERIC_TIMEZONE` (UTC by default).
8. Convex needs a reachable **production** n8n webhook URL ending `/webhook/lendloop-events`. For local Docker use an HTTPS development tunnel; localhost is not reachable from Convex Cloud. Set `N8N_WEBHOOK_URL` to this URL. Never use the `/webhook-test/` URL for durable integration.

The Compose setup is for local development, binding only to loopback. Code nodes deliberately permit crypto/http/https and environment access; only trusted workflow administrators should have editor access. If using external task runners, pass the same secret and module allowlist to the runner configuration. These workflows target the included self-hosted deployment; unmodified n8n Cloud cannot use the Node built-in allowlist/environment configuration. For Cloud, replace signing Code nodes with a credential-backed signing gateway.

## Behavior and architecture

Browser → Clerk JWT → Convex queries/mutations. `ConvexProviderWithClerk` passes the `convex` token. Convex verifies the issuer/audience and every protected function checks identity and ownership. Public `browse` returns exactly ID, name and category; owner, condition, description, availability and trust metadata are returned only after authentication.

Signed-in neighbors can create/edit/delete their listings, request date ranges, approve/decline incoming requests and mark approved loans returned. “My listings”, “My requests” and “Incoming requests” are live views. Admins get “All loans”, can remove listings and mark a lender trusted. Removal is soft deletion and requires resolving active requests first, preserving loan history. Admin status does not permit editing another user’s listing or changing their loan decisions.

Date ranges use inclusive UTC calendar dates. Requests cannot overlap an approved loan or duplicate the same borrower’s pending range. Approval checks overlaps again within the Convex transaction, so concurrent approvals cannot double-book. “On loan” describes availability today; future bookings are still enforced by the backend.

A mutation writes an outbox event and schedules delivery atomically. The action signs the notification, calls n8n with a timeout, retries with exponential backoff up to five attempts, and retains a failed event on exhaustion. Inspect the Convex `events` table/logs for pending/retrying/failed deliveries. Operators can retry a failed event through the internal `automation:deliver` action after resolving the cause. Delivery is at least once.

The request workflow verifies HMAC before recording a **durable mock notification**. The daily workflow POSTs to `/automation/overdue`, then records one mock reminder per loan per UTC date at `/automation/receipt`. A mock notification is a database receipt, visible on the associated loan; no actual email or Slack message is sent. This is the intentionally selected logged-mock notification channel. Replace it with a real provider only with provider-side idempotency support.

## Security and minimization

- HMAC-SHA256 authenticates both directions over `timestamp + '.' + JSON body`, with a five-minute replay window. n8n reconstructs JSON in insertion order; do not reorder/transform incoming fields before verification. Convex verifies raw request bytes. Comparisons use timing-safe equality in n8n and a fixed-length constant-work comparison in Convex. Use HTTPS outside local development.
- Replayed authenticated requests cause no extra notification records: receipt insertion checks a unique indexed application key inside a serializable Convex mutation. Scheduled reminder keys include loan ID and UTC date. Partial workflow failures safely retry the remaining receipts. The receipt itself is the mock notification, so a crash cannot separate mock delivery from deduplication.
- Notifications include only event key, opaque loan ID, event kind and recipient subject. No email, listing description, name or date range leaves Convex. The overdue endpoint returns the same minimal shape. Email delivery would require an explicit, restricted recipient lookup.
- Secrets come from runtime environment variables, never exported JSON or browser bundles. Only the public Clerk key and Convex URL have `NEXT_PUBLIC_` prefixes. The two integrations share a secret for local simplicity; split per direction and rotate with key IDs in production.
- n8n retries nodes three times and retains failed executions; the linked error workflow produces a visible failure. Convex independently retains exhausted outbox attempts. Inspect both execution histories during setup. Successful n8n executions are not retained; failed ones expire after seven days in Compose.

## Verify

`npm run typecheck`, `npm test`, `npm run build`.

Manual integration checklist after connecting accounts: anonymous query exposes no owner fields; anonymous mutations fail; user B cannot edit/remove A’s listing or approve A’s requests; admins can trust/remove but cannot impersonate lenders; simultaneous overlapping approvals produce one winner; replay a notification/reminder twice and inspect one receipt; tamper with HMAC and expect rejection; stop n8n and inspect retries and final failed outbox state; return an overdue loan and confirm it disappears from the next daily query.

## Production changes

Deploy Next.js to a Node hosting service and Convex to its production deployment; use separate production Clerk credentials. Put n8n behind HTTPS with secure cookies, managed Postgres, encrypted backups and restricted editors. Pin and audit all runtime images/dependencies, configure task runners explicitly, and add queue workers as traffic grows. Add pagination and indexed recipient/overdue queries, rate limits, neighborhood membership boundaries, retention policies and account deletion. Replace mock notifications with a provider supporting idempotency keys; add monitoring/alerts for failed outbox events and n8n error executions, scheduled reconciliation and dead-letter replay tooling. Extend the included Convex authorization, overlap, lifecycle and idempotency tests with deployed concurrency and end-to-end workflow tests before launch. Host licensed product photography locally rather than third-party sample imagery.

## Repository delivery

All source and workflow exports are in this directory. To publish to your GitHub account: initialize a repository here, commit, then run `gh repo create lendloop --private --source=. --push` after authenticating. The GitHub repository URL is supplied at handoff when publishing succeeds.

References: [Convex + Clerk](https://docs.convex.dev/auth/clerk), [n8n Code node module configuration](https://docs.n8n.io/hosting/configuration/configuration-examples/modules-in-code-node/).
