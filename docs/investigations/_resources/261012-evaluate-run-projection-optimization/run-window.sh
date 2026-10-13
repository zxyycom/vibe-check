#!/usr/bin/env bash
set -euo pipefail
if (( $# != 0 )); then
  printf '%s\n' 'arguments: this fixed-input historical helper accepts none' >&2
  exit 2
fi
ROOT=/workspace/vibe-check/tmp/optimization-20261012/run-projection
NODE=/home/dev/.local/share/mise/installs/node/24.18.0/bin/node
BUN=/home/dev/.local/share/mise/installs/bun/1.3.14/bin/bun
mkdir "$ROOT/raw/formal"
date -u +%FT%TZ > "$ROOT/window-start.txt"
for runtime in node bun; do
  binary="$NODE"
  [[ "$runtime" == node ]] || binary="$BUN"
  for shape in independent chain; do
    for parallel in 4 1; do
      sizes="32 128 512"
      if [[ "$parallel" == 1 ]]; then sizes="128 512"; fi
      if [[ "$runtime" == bun ]]; then
        [[ "$parallel" == 4 ]] || continue
        sizes="128 512"
      fi
      for size in $sizes; do
        index=0
        for side in before candidate candidate before; do
          target="$ROOT/raw/formal/$runtime-$shape-$size-p$parallel-$index-$side"
          "$binary" "$ROOT/public-run.mjs" "$ROOT/$side" "$shape" "$size" "$parallel" "$target.json" > "$target.stdout.txt" 2> "$target.stderr.txt"
          printf '%s %s N%s P%s %s %s done\n' "$runtime" "$shape" "$size" "$parallel" "$index" "$side"
          index=$((index+1))
        done
      done
    done
  done
done
date -u +%FT%TZ > "$ROOT/window-end.txt"
