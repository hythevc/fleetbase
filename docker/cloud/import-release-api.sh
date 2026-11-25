#!/usr/bin/env bash
set -euo pipefail

# The cloud daemon's rootless VFS driver copies each parent layer and cannot
# represent ownership IDs outside its user namespace. Import the release as a
# single layer and normalize only those out-of-range ownership IDs.
release='fleetbase/fleetbase-api@sha256:4022d56ff67f68927cdbc95eb9327a430ce82a254a62f8bcdb1557a0b6e06ee5'
crane_bin=${FLEETBASE_CRANE:-crane}
local_image=${FLEETBASE_API_IMAGE:-fleetbase-api-local:v0.7.67}

image_config=$("$crane_bin" config "$release")
image_changes=$(jq -r '.config | ("WORKDIR " + .WorkingDir), ("ENTRYPOINT " + (.Entrypoint | tojson)), ("CMD " + (.Cmd | tojson)), (.Env[] | capture("^(?<name>[^=]+)=(?<value>.*)$") | "ENV " + .name + "=" + (.value | tojson))' <<< "$image_config")
changes=()
while IFS= read -r change; do
    changes+=(--change "$change")
done <<< "$image_changes"

"$crane_bin" export "$release" - | python3 -c '
import sys
import tarfile

with tarfile.open(fileobj=sys.stdin.buffer, mode="r|") as source:
    with tarfile.open(fileobj=sys.stdout.buffer, mode="w|") as destination:
        for entry in source:
            if entry.name.lstrip("./") == "fleetbase/api/auth.json":
                continue
            for number, name in (("uid", "uname"), ("gid", "gname")):
                if not 0 <= getattr(entry, number) <= 65535:
                    setattr(entry, number, 0)
                    setattr(entry, name, "root")
                    entry.pax_headers.pop(number, None)
                    entry.pax_headers.pop(name, None)
            destination.addfile(entry, source.extractfile(entry) if entry.isfile() else None)
' | docker import \
    --change 'LABEL org.opencontainers.image.source=https://github.com/fleetbase/fleetbase' \
    --change 'LABEL org.opencontainers.image.version=0.7.67' \
    "${changes[@]}" - "$local_image"
