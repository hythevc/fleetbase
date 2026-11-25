import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const apiKey = process.env.FLEETBASE_API_KEY?.trim();
const baseUrl = getApiBaseUrl(process.env.FLEETBASE_API_URL ?? 'http://127.0.0.1:3000/v1');

const server = new McpServer({ name: 'fleetbase', version: '0.1.0' });
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const recordId = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).describe('Fleetbase record ID.');
const pagination = {
    limit: z.number().int().min(1).max(100).default(20).describe('Number of results per page.'),
    page: z.number().int().min(1).default(1).describe('Page number starting at 1.'),
};

function getApiBaseUrl(value) {
    const invalidUrl = 'Set FLEETBASE_API_URL to a Fleetbase HTTPS URL or a local loopback HTTP URL.';
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error(invalidUrl);
    }

    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const secureTransport = url.protocol === 'https:' || (url.protocol === 'http:' && loopback);
    if (!secureTransport || url.username || url.password || url.search || url.hash) {
        throw new Error(invalidUrl);
    }

    url.pathname = url.pathname.replace(/\/+$/, '');
    if (!url.pathname.endsWith('/v1')) {
        throw new Error('FLEETBASE_API_URL must include the Fleetbase API version path ending in /v1.');
    }

    url.pathname += '/';
    return url;
}

function toolError(message) {
    return { isError: true, content: [{ type: 'text', text: message }] };
}

async function getFromFleetbase(path, query = {}) {
    if (!apiKey) {
        return toolError('Set FLEETBASE_API_KEY to an API key from your Fleetbase organization.');
    }

    const url = new URL(path, baseUrl);
    for (const [name, value] of Object.entries(query)) {
        url.searchParams.set(name, String(value));
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
            redirect: 'error',
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
            await response.body?.cancel();
            return toolError(`Fleetbase API request failed (HTTP ${response.status}).`);
        }

        const data = await response.json();
        return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    } catch (error) {
        if (error instanceof SyntaxError) {
            return toolError('Fleetbase returned a response that was not valid JSON.');
        }
        if (error.name === 'TimeoutError') {
            return toolError('The Fleetbase API request timed out.');
        }
        return toolError('Could not reach the Fleetbase API. Check FLEETBASE_API_URL and the Fleetbase service.');
    }
}

server.registerTool(
    'fleetbase_get_organization',
    { description: 'Get the Fleetbase organization associated with the configured API key.', inputSchema: {}, annotations },
    () => getFromFleetbase('organizations/current'),
);

const resources = [
    { singular: 'order', plural: 'orders' },
    { singular: 'driver', plural: 'drivers' },
    { singular: 'vehicle', plural: 'vehicles' },
];

for (const { singular, plural } of resources) {
    server.registerTool(
        `fleetbase_list_${plural}`,
        { description: `List Fleetbase ${plural} for the configured organization.`, inputSchema: pagination, annotations },
        ({ limit, page }) => getFromFleetbase(plural, { limit, page }),
    );

    server.registerTool(
        `fleetbase_get_${singular}`,
        { description: `Get one Fleetbase ${singular} by ID.`, inputSchema: { id: recordId }, annotations },
        ({ id }) => getFromFleetbase(`${plural}/${encodeURIComponent(id)}`),
    );
}

await server.connect(new StdioServerTransport());
