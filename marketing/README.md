# Fleetbase marketing site

The marketing site is deployed separately from the Fleetbase console. It uses the console's logo, Inter typography, colors, and production branding response. Sign-in opens the existing console.

## Run locally

```sh
npm ci
npm run dev
npm run build
```

Use Node 22.22 or later in the Node 22 series. Local Vite requests proxy to Railway. Set `FLEETBASE_API_ORIGIN` to point local development at another API and `VITE_FLEETBASE_CONSOLE_URL` to use a different console. Vercel uses the three public rewrites in [vercel.json](vercel.json).

The demo form submits to the Railway intake through `/api/demo-requests`. The browser needs no Fleetbase API key or owner token. A `202` acknowledgement means the request was accepted. The production intake deduplicates retries and stores requests in a private table. A signed-in Hythe VC owner can retrieve the requests through the authenticated [Railway API](../deploy/railway/README.md). Use a local fixture or the server's honeypot for tests so test requests do not enter the production inbox.

## Design references

The freight photography, interactive product preview, and Fleetbase styles are original to this site. Layout ideas came from Aurora's freight hero and Beside's product tabs on [Mobbin](https://mobbin.com/sites/sections/3ffb4e40-3d9e-4f66-adb7-b04bc5a831cb), Zendesk's outcome copy and photo pairing on [Refero](https://refero.design/pages/7eff0b7a-8385-4f96-b03e-3d2effa16ddd), and the keyboard-friendly [Feature Tab Switcher on 21st](https://21st.dev/@mohammadshehadeh/components/feature-11). The site uses Radix Tabs for the interaction and renders only clearly labeled sample operations in the public preview.
