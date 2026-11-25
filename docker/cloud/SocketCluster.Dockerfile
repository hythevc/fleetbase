# syntax=docker/dockerfile:1
FROM node:22.22.0-alpine3.22
WORKDIR /socketcluster
RUN --mount=type=secret,id=build_ca,required=true \
    export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca \
    && npm pack --silent socketcluster@17.4.0 \
    && node -e "const data = require('node:fs').readFileSync('socketcluster-17.4.0.tgz'); if (require('node:crypto').createHash('sha512').update(data).digest('base64') !== 'GogKcXmI/LPamus6Z2wsEx5PIsfhjcRdcMnVzCnqsLOBKdkfUrk55VDbLFAezV8s0Aydy1eXiw2vt/aLr1dKKA==') process.exit(1)" \
    && tar -xzf socketcluster-17.4.0.tgz --strip-components=1 \
    && rm socketcluster-17.4.0.tgz \
    && cd app \
    && npm ci --omit=dev --no-audit --no-fund
ENV ENV=prod
WORKDIR /socketcluster/app
USER node
CMD ["node", "server.js"]
