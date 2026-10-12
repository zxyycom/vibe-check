#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")" && pwd)
[[ "$root" == /tmp/vibe-check-r04-profile-* ]] || { echo 'Expected owned profiling root' >&2; exit 1; }
cd /workspace/vibe-check
if compgen -G "$root/raw/formal-*" > /dev/null; then
  echo "Existing formal evidence: refusing to overwrite; use a fresh owned root for another round" >&2
  exit 1
fi
: > "$root/raw/formal-process-order.txt"
process=0
workload=0
for shape in independent chain; do
  for size in 8 32 128 512; do
    case "$size" in 8) iterations=10 ;; 32) iterations=5 ;; *) iterations=1 ;; esac
    if (( workload < 4 )); then modes=(baseline instrumented instrumented baseline); else modes=(instrumented baseline baseline instrumented); fi
    for mode in "${modes[@]}"; do
      printf -v name 'formal-%02d-%s-%s-%s' "$process" "$shape" "$size" "$mode"
      printf '%s\t%s\t%s\t%s\t%s\n' "$(date --iso-8601=ns --utc)" "$process" "$shape" "$size" "$mode" >> "$root/raw/formal-process-order.txt"
      timeout --signal=TERM --kill-after=5s 60s mise exec -- bun run "$root/public-run-profile.ts" --mode "$mode" --shape "$shape" --size "$size" --warmups 3 --samples 9 --iterations "$iterations" > "$root/raw/$name.json" 2> "$root/raw/$name.stderr.txt"
      printf 'Completed %s\n' "$name"
      process=$(( process + 1 ))
    done
    workload=$(( workload + 1 ))
  done
done
