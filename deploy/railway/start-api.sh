#!/usr/bin/env bash
set -euo pipefail

cd /fleetbase/api
printf '%s' "${FLEETBASE_RAILWAY_GUARD:?Onboarding guard is required}" | base64 --decode >/tmp/fleetbase-railway-guard.php
php /tmp/fleetbase-railway-guard.php
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
