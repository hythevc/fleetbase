# Fleetbase in the cloud workspace

The Compose stack serves the console, v1 API, uploads, and WebSockets on port `3000`. MySQL and Redis use named volumes. Only the gateway publishes a host port. Run the commands below from the repository root.

The API container also runs the queue worker and scheduler to keep disk use within the cloud machine's Docker VFS limits. For separate worker containers on a machine with more storage, set `FLEETBASE_EMBED_WORKERS=false` and enable the `standalone-workers` Compose profile.

## Start an existing installation

```sh
docker/cloud/compose.sh up -d --no-build
docker/cloud/compose.sh ps
curl -fsS http://127.0.0.1:3000/health
```

Open the Fleetbase console using the environment's HTTP preview for port `3000`, or visit `http://127.0.0.1:3000/onboard` inside the shared Cloud desktop. The first console signup creates the organization and its administrator. Use your actual organization details for that signup.

## Rebuild the images and initialize a fresh database

Use Docker Compose v2, Node.js 22.22.0, Corepack, and OpenSSL. The wrapper creates a local `docker/cloud/.env` with application and database secrets on first use. Keep this file with the installation to preserve the application key and access to its data volumes.

Build the console with the repository's locked dependencies. If this environment uses an HTTPS proxy, set `NODE_USE_ENV_PROXY=1` and `NODE_EXTRA_CA_CERTS` to the environment's CA path before installing packages.

```sh
(cd console && corepack pnpm install --frozen-lockfile)
(cd console && DISABLE_RUNTIME_CONFIG=false corepack pnpm build --environment production)
docker build -f docker/cloud/console.Dockerfile -t fleetbase-cloud-console:latest console
docker/cloud/compose.sh build httpd socket
```

Build the API with `docker/cloud/compose.sh build application` on a Docker daemon with enough layer storage and Composer access to the locked dependencies. This workspace runs the matching published v0.7.67 API. To recreate that image here, install `crane`, `jq`, and Python 3, then run `docker/cloud/import-release-api.sh`. Set `FLEETBASE_CRANE` if `crane` is outside `PATH`. The import uses the pinned Linux amd64 digest and combines its layers for the rootless VFS daemon.

```sh
chmod a+r docker/cloud/database-init.sql
docker/cloud/compose.sh up -d --no-build --wait database cache socket
docker/cloud/compose.sh up -d --no-build application
docker/cloud/compose.sh exec -T application sh -ec './deploy.sh && touch storage/app/.cloud-deployed'
docker/cloud/compose.sh restart application
docker/cloud/compose.sh up -d --no-build
```

For an external origin, set `FLEETBASE_PUBLIC_URL` to the actual HTTPS origin so Fleetbase can generate links. Provider credentials can go in the ignored `docker/cloud/integrations.env` file. Set `FLEETBASE_MAIL_MAILER`, `FLEETBASE_MAIL_FROM_ADDRESS`, or `FLEETBASE_FILESYSTEM_DRIVER` in `docker/cloud/.env` to select configured providers. Apply changes with `docker/cloud/compose.sh up -d --no-build`. Default mail uses the log driver and uploads stay on the local volume.

See [Fleetbase MCP setup](../../mcp/README.md) to connect a company-scoped API key to the read-only MCP tools.
