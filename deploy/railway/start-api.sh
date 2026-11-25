#!/usr/bin/env bash
set -euo pipefail

cd /fleetbase/api
if [[ -n ${FLEETBASE_RAILWAY_MARKETING_ROUTES:-} ]]; then
    mkdir -p routes
    printf '%s' "$FLEETBASE_RAILWAY_MARKETING_ROUTES" | base64 --decode >routes/railway-marketing.php
    php -l routes/railway-marketing.php >/dev/null
fi
printf '%s' "${FLEETBASE_RAILWAY_GUARD:?Onboarding guard is required}" | base64 --decode >/tmp/fleetbase-railway-guard.php
php /tmp/fleetbase-railway-guard.php
if [[ -n ${FLEETBASE_RAILWAY_MARKETING_ROUTES:-} ]]; then
    php artisan route:clear >/dev/null
    printf 'Fleetbase marketing routes installed\n'
fi
for request in OnboardRequest SignUpRequest; do
    request_file="vendor/fleetbase/core-api/src/Http/Requests/${request}.php"
    grep -q 'FLEETBASE_PUBLIC_SIGNUPS' "$request_file"
    php -l "$request_file" >/dev/null
done
printf 'Fleetbase owner and legacy signup guards installed\n'
mkdir -p storage/app/public
if [[ ! -e public/storage && ! -L public/storage ]]; then
    ln -s /fleetbase/api/storage/app/public public/storage
fi

exec php artisan octane:frankenphp --max-requests=1000 --port="${PORT:-8000}" --host=:: --workers=2 --log-level=WARN
