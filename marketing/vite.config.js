import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';

const target = process.env.FLEETBASE_API_ORIGIN || 'https://fleetbase-api-production-0a89e6b7.up.railway.app';
const ProxyAgent = new URL(target).protocol === 'https:' ? HttpsAgent : HttpAgent;
const proxyEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => /^(https?_proxy|no_proxy)$/i.test(name)));
const agent = new ProxyAgent({ proxyEnv });
const paths = {
    '/api/branding': '/int/v1/settings/branding',
    '/api/status': '/health',
    '/api/demo-requests': '/marketing/v1/demo-requests',
};

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: Object.fromEntries(
            Object.entries(paths).map(([source, destination]) => [source, { target, agent, changeOrigin: true, rewrite: () => destination }]),
        ),
    },
});
