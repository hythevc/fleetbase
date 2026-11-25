#!/usr/bin/env bash
set -euo pipefail

cloud_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd -- "$cloud_dir/../.." && pwd)
secrets_file="$cloud_dir/.env"
if [[ ! -e "$secrets_file" ]]; then
    umask 077
    temporary_env=$(mktemp "$cloud_dir/.env.XXXXXX")
    trap 'rm -f -- "$temporary_env"' EXIT
    {
        printf 'FLEETBASE_APP_KEY=base64:%s\n' "$(openssl rand -base64 32)"
        printf 'FLEETBASE_DB_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 24)"
        printf 'FLEETBASE_DB_PASSWORD=%s\n' "$(openssl rand -hex 24)"
    } > "$temporary_env"
    ln -- "$temporary_env" "$secrets_file" 2>/dev/null || [[ -f "$secrets_file" ]]
fi

docker compose --project-name fleetbase-cloud --project-directory "$repo_dir" \
    --env-file "$secrets_file" -f "$repo_dir/docker-compose.yml" -f "$cloud_dir/compose.yml" "$@"
