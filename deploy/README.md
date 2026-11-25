# Hosted Fleetbase

The console is built from `console/` on Vercel. Railway runs the v0.7.67 API, MySQL, Redis, queue worker, scheduler, and SocketCluster. The API is on a public HTTPS domain. The database, cache, and socket stay on the Railway private network.

- [Production console](https://hythe-fleetbase.vercel.app)
- [Railway API health check](https://fleetbase-api-production-0a89e6b7.up.railway.app/health)
- [Railway API variable settings](https://railway.com/project/f7a54ab7-56a8-4f50-b329-e7dff1134ab8/service/42729d2b-942c-461f-a9a4-53522cdf385f/variables)

Open `/onboard` on the Vercel site to claim the first administrator. In Railway's API variable settings, copy the value of `FLEETBASE_SETUP_TOKEN` into the **Administrator setup token** field. Enter your organization details and set your password directly in Fleetbase.

Additional public signups are controlled by `FLEETBASE_PUBLIC_SIGNUPS` on the API service. Configure outbound mail for email verification before enabling public signups.

After onboarding, create a company API key under **Developers → API Keys** and provide it as `FLEETBASE_API_KEY` in your MCP client environment. Set `FLEETBASE_API_URL` to `https://fleetbase-api-production-0a89e6b7.up.railway.app/v1` for this deployment. [MCP setup and tests](../mcp/README.md)

The Vercel build takes public endpoint defaults from `console/vercel.defaults.json`. `FLEETBASE_API_ORIGIN` and `FLEETBASE_SETUP_TOKEN_REQUIRED` can override those defaults at build time. Leave `FLEETBASE_SOCKET_ORIGIN` unset while SocketCluster is private. The console enables realtime connections only when a socket origin is configured.

The Vercel source is on `codex/fleetbase-vercel`. Its build uses Node 22 and one minification worker. The deployed build on `codex/fleetbase-prebuilt` packages the same verified console assets from the source branch. Keep Railway's `CONSOLE_HOST` set to the canonical Vercel origin, or update it before changing the console domain.
