#!/usr/bin/env bash
set -euo pipefail

cd /fleetbase/api
php artisan migrate --force
php artisan sandbox:migrate --force

if [[ -n ${FLEETBASE_RAILWAY_MARKETING_MIGRATION:-} ]]; then
    directory=$(mktemp -d)
    migration="$directory/2026_11_25_000001_create_marketing_demo_requests_table.php"
    trap 'rm -f "$migration"; rmdir "$directory"' EXIT
    printf '%s' "$FLEETBASE_RAILWAY_MARKETING_MIGRATION" | base64 --decode >"$migration"
    php -l "$migration" >/dev/null
    php artisan migrate --database=mysql --force --realpath --path="$directory"
fi
