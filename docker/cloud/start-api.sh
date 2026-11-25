#!/usr/bin/env bash
set -euo pipefail

if [[ ! -e public/storage && ! -L public/storage ]]; then
    ln -s /fleetbase/api/storage/app/public public/storage
fi

if [[ ${FLEETBASE_EMBED_WORKERS:-true} != true ]]; then
    exec php artisan octane:frankenphp --max-requests=1000 --port=8000 --host=0.0.0.0
fi

run_queue() {
    # queue:restart exits the worker cleanly so it can load new code/config.
    local worker_pid
    while true; do
        php artisan queue:work &
        worker_pid=$!
        trap 'kill -TERM "$worker_pid" 2>/dev/null || true; wait "$worker_pid" || true; exit 0' TERM INT
        wait "$worker_pid" || return 1
        sleep 1
    done
}

php artisan octane:frankenphp --max-requests=1000 --port=8000 --host=0.0.0.0 &
api_pid=$!
(
    until [[ -f storage/app/.cloud-deployed ]]; do sleep 2; done
    run_queue
) &
queue_pid=$!
(
    until [[ -f storage/app/.cloud-deployed ]]; do sleep 2; done
    exec go-crond --verbose root:./crontab
) &
scheduler_pid=$!

stop_services() {
    kill -TERM "$api_pid" "$queue_pid" "$scheduler_pid" 2>/dev/null || true
    wait 2>/dev/null || true
}
trap stop_services EXIT
trap 'exit 0' TERM INT
wait -n "$api_pid" "$queue_pid" "$scheduler_pid"
