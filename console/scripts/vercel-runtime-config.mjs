import { readFile, writeFile } from 'node:fs/promises';

const defaults = JSON.parse(await readFile(new URL('../vercel.defaults.json', import.meta.url), 'utf8'));

function httpsOrigin(name, value = process.env[name]) {
    if (!value) {
        throw new Error(`Set ${name} to an HTTPS origin.`);
    }

    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error(`Set ${name} to an HTTPS origin without credentials, a path, or a query.`);
    }
    return url;
}

const api = httpsOrigin('FLEETBASE_API_ORIGIN', process.env.FLEETBASE_API_ORIGIN || defaults.apiOrigin);
const socket = process.env.FLEETBASE_SOCKET_ORIGIN ? httpsOrigin('FLEETBASE_SOCKET_ORIGIN') : null;
const config = {
    API_HOST: api.origin,
    API_NAMESPACE: 'int/v1',
    SETUP_TOKEN_REQUIRED: process.env.FLEETBASE_SETUP_TOKEN_REQUIRED === undefined
        ? defaults.setupTokenRequired === true
        : process.env.FLEETBASE_SETUP_TOKEN_REQUIRED === 'true',
    SOCKETCLUSTER_AUTO_CONNECT: Boolean(socket),
    ...(socket && {
        SOCKETCLUSTER_HOST: socket.hostname,
        SOCKETCLUSTER_PORT: socket.port || 443,
        SOCKETCLUSTER_SECURE: true,
    }),
};

await writeFile(new URL('../dist/fleetbase.config.json', import.meta.url), JSON.stringify(config, null, 2) + '\n');
