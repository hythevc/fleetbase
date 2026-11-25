# Fleetbase on Railway

Production runs in the `hythe-fleetbase` Railway project. The Fleetbase API, queue, and scheduler use the v0.7.67 image pinned to `sha256:4022d56ff67f68927cdbc95eb9327a430ce82a254a62f8bcdb1557a0b6e06ee5`, which matches the checkout's Composer lock. MySQL 8.0, Redis, and SocketCluster are on the project's private network. MySQL, Redis, and public API uploads use persistent volumes.

The backend is at `https://fleetbase-api-production-0a89e6b7.up.railway.app`. The Vercel production origin `https://hythe-fleetbase.vercel.app` is allowed through `CONSOLE_HOST` and `FRONTEND_HOSTS`.

## First organization

Open the `fleetbase-api` service's Variables tab in Railway and copy `FLEETBASE_SETUP_TOKEN` into the instance setup token field on the Vercel onboarding page. Use your own company and administrator details in the form. The API checks the setup token for the first administrator and serializes the claim so simultaneous requests cannot create multiple instance administrators. The legacy signup endpoint stays disabled until an owner exists and public signups are enabled. Leave `FLEETBASE_PUBLIC_SIGNUPS=false` until you configure a production verification mailer and are ready to accept public organization signups.

Keep the setup token out of Vercel configuration, Git, and chat. The Fleetbase MCP adapter uses a separate company-scoped API key from **Developers → API Keys**. Set `FLEETBASE_API_URL` to `https://fleetbase-api-production-0a89e6b7.up.railway.app/v1` and provide the company key as `FLEETBASE_API_KEY` through your MCP client's environment.

## Deployment configuration

- The MySQL start command decodes and executes `start-mysql.sh`. On a fresh volume it grants the application user access to the main, sandbox, and Storefront databases. Root credentials stay on the MySQL service.
- Before the first deploy, `fleetbase-api` runs `./deploy.sh` to migrate and seed the database. On later deploys, the predeploy command checks the main and sandbox migrations. The startup command decodes `start-api.sh` and `install-api-guard.php` from Railway configuration, installs the onboarding guards in the pinned image, and starts FrankenPHP. `/health` is the Railway readiness endpoint.
- The queue checks Redis at startup and runs `php artisan queue:work --tries=3 --sleep=3`. The scheduler runs `go-crond --verbose root:./crontab`. Both receive the app configuration and the connection variables for the private MySQL and Redis services.
- SocketCluster remains private because the included SocketCluster server has no organization-level authorization on browser subscriptions or publications. The Vercel console disables browser realtime until authenticated channels are available.
- Default email uses the log driver. For account verification, password reset, and delivery notifications, set `MAIL_MAILER` and your provider credentials in Railway. Keep credentials in Railway and keep the rendering origin on Vercel.
