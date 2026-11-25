# Fleetbase MCP

This stdio server reads the current organization, orders, drivers, and vehicles through the Fleetbase v1 API. The API key determines which organization the server can access.

From the repository root, install the locked dependencies and run the MCP integration test with Node.js 20 or later.

```sh
npm ci --prefix mcp
npm test --prefix mcp
```

In Fleetbase, open **Developers → API Keys** for the desired organization. Supply the key as the `FLEETBASE_API_KEY` environment variable in your MCP client. If using a shell, this reads the key without echoing it or adding it to command history.

```sh
read -rs FLEETBASE_API_KEY
export FLEETBASE_API_KEY
```

Add the following to your Codex configuration and replace the script path with the absolute path to this checkout.

```toml
[mcp_servers.fleetbase]
command = "node"
args = ["/workspace/fleetbase/mcp/server.mjs"]
env_vars = ["FLEETBASE_API_KEY", "FLEETBASE_API_URL"]
```

The default API URL is `http://127.0.0.1:3000/v1` for the cloud workspace gateway. For another Fleetbase instance, set `FLEETBASE_API_URL` to its HTTPS v1 URL or its loopback HTTP v1 URL. Start a new Codex session with these environment variables and call `fleetbase_get_organization` to verify the API connection. Use `fleetbase_list_orders`, `fleetbase_list_drivers`, and `fleetbase_list_vehicles` for paginated reads or the corresponding `fleetbase_get_*` tool for a specific record.
