import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const apiKey = 'test_mock_only';
const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));

test('Fleetbase MCP serves read-only tools over stdio', { timeout: 15_000 }, async (t) => {
    const organization = { id: 'company_123', name: 'Example Logistics' };
    const orders = { data: [{ id: 'order_123', status: 'created' }], meta: { current_page: 2 } };
    const vehicle = { id: 'vehicle_123', name: 'Delivery Van' };
    const requests = [];
    const responseByPath = new Map([
        ['/v1/organizations/current', { body: organization }],
        ['/v1/orders?limit=3&page=2', { body: orders }],
        ['/v1/vehicles/vehicle_123', { body: vehicle }],
        ['/v1/drivers/driver_123', { status: 503, body: { message: `Private upstream detail: ${apiKey}` } }],
    ]);
    const api = createServer((request, response) => {
        const { method, url, headers } = request;
        requests.push({ method, path: url, authorization: headers.authorization, accept: headers.accept });

        const { status = 200, body } = responseByPath.get(url) ?? { status: 404, body: { message: 'Unknown route' } };
        response.writeHead(status, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(body));
    });
    await new Promise((resolve, reject) => {
        api.once('error', reject);
        api.listen(0, '127.0.0.1', resolve);
    });
    t.after(() => new Promise((resolve, reject) => {
        api.close((error) => (error ? reject(error) : resolve()));
    }));

    const client = new Client({ name: 'fleetbase-mcp-test', version: '1.0.0' });
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverPath],
        env: {
            FLEETBASE_API_URL: `http://127.0.0.1:${api.address().port}/v1`,
            FLEETBASE_API_KEY: apiKey,
        },
    });
    t.after(() => client.close());
    await client.connect(transport);

    await t.test('initializes and discovers the expected read-only operations', async () => {
        const { tools } = await client.listTools();
        assert.deepEqual(tools.map(({ name }) => name).sort(), [
            'fleetbase_get_driver',
            'fleetbase_get_order',
            'fleetbase_get_organization',
            'fleetbase_get_vehicle',
            'fleetbase_list_drivers',
            'fleetbase_list_orders',
            'fleetbase_list_vehicles',
        ]);
        assert.ok(tools.every(({ annotations }) => annotations?.readOnlyHint === true));
        assert.deepEqual(requests, []);
    });

    await t.test('returns Fleetbase results and forwards pagination and scoped authentication', async () => {
        const cases = [
            ['fleetbase_get_organization', {}, '/v1/organizations/current', organization],
            ['fleetbase_list_orders', { limit: 3, page: 2 }, '/v1/orders?limit=3&page=2', orders],
            ['fleetbase_get_vehicle', { id: 'vehicle_123' }, '/v1/vehicles/vehicle_123', vehicle],
        ];

        for (const [name, arguments_, path, expected] of cases) {
            const result = await client.callTool({ name, arguments: arguments_ });
            assert.notEqual(result.isError, true);
            const content = result.content.find(({ type }) => type === 'text');
            assert.ok(content, 'MCP returned JSON in text content');
            assert.deepEqual(JSON.parse(content.text), expected);
            assert.doesNotMatch(JSON.stringify(result), new RegExp(apiKey));
            assert.deepEqual(requests.at(-1), {
                method: 'GET',
                path,
                authorization: `Bearer ${apiKey}`,
                accept: 'application/json',
            });
        }
        assert.equal(requests.length, cases.length);
    });

    await t.test('rejects malformed arguments and reports upstream failure without disclosing authentication', async () => {
        const countBeforeValidation = requests.length;
        for (const arguments_ of [{}, { id: '../orders' }]) {
            const invalid = await client.callTool({ name: 'fleetbase_get_vehicle', arguments: arguments_ });
            assert.equal(invalid.isError, true);
        }
        assert.equal(requests.length, countBeforeValidation);

        const unavailable = await client.callTool({ name: 'fleetbase_get_driver', arguments: { id: 'driver_123' } });
        assert.equal(unavailable.isError, true);
        assert.match(JSON.stringify(unavailable), /503/);
        assert.doesNotMatch(JSON.stringify(unavailable), new RegExp(apiKey));
        assert.equal(requests.at(-1).path, '/v1/drivers/driver_123');
        assert.equal(requests.length, countBeforeValidation + 1);
    });
});
