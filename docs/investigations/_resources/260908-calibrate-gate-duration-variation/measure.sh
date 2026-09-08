#!/usr/bin/env bash
# Run only after coordinating agent declares stable inputs.
set -uo pipefail
ROOT=/workspace/vibe-check
OUT=${1:-/tmp/gate-evidence-20260908/run-$(date -u +%Y%m%dT%H%M%SZ)}
MODE=${2:-plan}
mkdir -p "$OUT/raw" "$OUT/gate"
cd "$ROOT"
printf 'startedAt=%s\n' "$(date -u +%FT%TZ)" > "$OUT/environment.txt"
printf 'bun=%s\nuname=%s\nnproc=%s\nmode=%s\n' "$(bun --version)" "$(uname -a)" "$(nproc)" "$MODE" >> "$OUT/environment.txt"
snapshot_input() {
  local tag="$1" file
  git rev-parse HEAD > "$OUT/input-$tag.head" 2>&1 || true
  git status --short > "$OUT/input-$tag.status" 2>&1 || true
  git diff --no-ext-diff --binary > "$OUT/input-$tag.unstaged.diff" 2>&1 || true
  git diff --cached --no-ext-diff --binary > "$OUT/input-$tag.staged.diff" 2>&1 || true
  {
    printf 'unstagedDiffSha256='; sha256sum "$OUT/input-$tag.unstaged.diff" | awk '{print $1}'
    printf 'stagedDiffSha256='; sha256sum "$OUT/input-$tag.staged.diff" | awk '{print $1}'
    printf 'untracked content hashes (git excludes respected):\n'
    while IFS= read -r -d $'\0' file; do sha256sum -- "$file"; done < <(git ls-files --others --exclude-standard -z)
  } > "$OUT/input-$tag.manifest"
}
snapshot_input before
cat > "$OUT/protocol.txt" <<'EOF'
Predeclared sample count: 5 serial complete-Gate runs, then 5 serial cycles of four public payload proxies.
Gate primary endpoint: shell wall-clock elapsed measured around the formal command. Gate elapsed/phase, core execution duration, and bounded scheduler task-active facts are attribution only.
Core check.finished.durationMs excludes preflight and admission waiting; admitted-to-settled taskActiveMs is only exposed for scheduler summary top admission delays.
Payload proxies: typecheck product, typecheck scripts, lint product, lint scripts. They are not Project-Gate Check baselines.
All stdout/stderr, exit statuses, and discovered Gate evidence paths are retained; no result-based exclusion.
No source modification, cache/history clearing, or environment setup is performed. Learned history may naturally update.
EOF
run_one() {
  local label="$1" before after status f id
  shift
  before=$(mktemp "$OUT/before.XXXX")
  after=$(mktemp "$OUT/after.XXXX")
  find .log/project-gate -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort > "$before"
  local startedNs endedNs
  startedNs=$(date +%s%N)
  set +e
  "$@" > "$OUT/raw/$label.stdout" 2> "$OUT/raw/$label.stderr"
  status=$?
  set -e
  endedNs=$(date +%s%N)
  printf 'outerWallClockStartedNs=%s\nouterWallClockEndedNs=%s\nouterElapsedSeconds=%.9f\nexitStatus=%s\n' "$startedNs" "$endedNs" "$((endedNs-startedNs))e-9" "$status" > "$OUT/raw/$label.time"
  find .log/project-gate -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort > "$after"
  comm -13 "$before" "$after" > "$OUT/gate/$label.new-invocations.txt"
  while IFS= read -r id; do
    [ -z "$id" ] && continue
    mkdir -p "$OUT/gate/$label/$id"
    for f in gate.log core.log scheduler.log machine/run.json machine/records.ndjson; do
      [ -f ".log/project-gate/$id/$f" ] && cp ".log/project-gate/$id/$f" "$OUT/gate/$label/$id/${f//\//_}"
    done
  done < "$OUT/gate/$label.new-invocations.txt"
  printf '%s\t%s\t%s\n' "$label" "$status" "$*" >> "$OUT/manifest.tsv"
  rm -f "$before" "$after"
}
if [ "$MODE" = plan ]; then printf 'Plan only; no workload executed.\n'; exit 0; fi
if [ "$MODE" != run ]; then echo 'usage: measure.sh [output-dir] [plan|run]' >&2; exit 64; fi
for i in 1 2 3 4 5; do run_one "gate-all-$i" bun run check -- --all; done
for i in 1 2 3 4 5; do
  run_one "typecheck-product-$i" bun run typecheck -- product
  run_one "typecheck-scripts-$i" bun run typecheck -- scripts
  run_one "lint-product-$i" bun run lint -- product
  run_one "lint-scripts-$i" bun run lint -- scripts
done
snapshot_input after
printf 'finishedAt=%s\n' "$(date -u +%FT%TZ)" >> "$OUT/environment.txt"
