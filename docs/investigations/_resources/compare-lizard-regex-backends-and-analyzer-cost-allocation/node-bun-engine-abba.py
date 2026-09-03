import datetime
import hashlib
import json
import math
import os
import platform
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
DRIVER = Path(__file__).with_name("node-bun-engine-driver.ts")
if len(sys.argv) != 2:
    raise SystemExit("usage: node-bun-engine-abba.py <request.json>")
REQUEST = Path(sys.argv[1])
if not REQUEST.is_file():
    raise SystemExit(f"request does not exist: {REQUEST}")
MODES = ("matcher", "tokens", "full")
RUNTIMES = ("node", "bun")


def run(runtime: str, mode: str) -> dict:
    command = (["node", str(DRIVER), mode, str(REQUEST)] if runtime == "node" else ["bun", str(DRIVER), mode, str(REQUEST)])
    started = time.monotonic_ns()
    completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=True)
    observed_ms = (time.monotonic_ns() - started) / 1_000_000
    result = json.loads(completed.stdout)
    return {"runtime": runtime, "mode": mode, "operationMs": result["operationMs"], "observedWallMs": observed_ms, "preflight": result["preflight"], "runtimeIdentity": result["runtime"], "stderr": completed.stderr}


def quantile(values: list[float], p: float) -> float:
    values = sorted(values)
    i = (len(values) - 1) * p
    lo, hi = math.floor(i), math.ceil(i)
    return values[lo] * (hi - i) + values[hi] * (i - lo)


def summary(values: list[float]) -> dict:
    return {"n": len(values), "medianMs": quantile(values, .5), "p10Ms": quantile(values, .1), "p90Ms": quantile(values, .9), "minMs": min(values), "maxMs": max(values)}

rows = []
for block in range(1, 9):
    order = ("node", "bun", "bun", "node") if block % 2 else ("bun", "node", "node", "bun")
    for mode in MODES:
        for runtime in order:
            row = run(runtime, mode)
            row.update({"block": block, "ordinal": len(rows) + 1})
            rows.append(row)
            print(f"block={block} mode={mode} runtime={runtime} operationMs={row['operationMs']:.3f}", file=sys.stderr, flush=True)

results = {}
for mode in MODES:
    per_runtime = {}
    paired = []
    for runtime in RUNTIMES:
        selected = [row for row in rows if row["mode"] == mode and row["runtime"] == runtime]
        per_runtime[runtime] = {"operation": summary([row["operationMs"] for row in selected]), "observedWall": summary([row["observedWallMs"] for row in selected]), "runtimeIdentity": selected[0]["runtimeIdentity"], "preflight": selected[0]["preflight"]}
    for block in range(1, 9):
        node = [row["operationMs"] for row in rows if row["mode"] == mode and row["runtime"] == "node" and row["block"] == block]
        bun = [row["operationMs"] for row in rows if row["mode"] == mode and row["runtime"] == "bun" and row["block"] == block]
        node_geo, bun_geo = math.sqrt(node[0] * node[1]), math.sqrt(bun[0] * bun[1])
        paired.append({"block": block, "nodeGeomeanMs": node_geo, "bunGeomeanMs": bun_geo, "nodeDividedByBun": node_geo / bun_geo})
    results[mode] = {"perRuntime": per_runtime, "paired": paired, "pairedNodeDividedByBunMedian": quantile([row["nodeDividedByBun"] for row in paired], .5)}

print(json.dumps({"schemaVersion": 1, "formedAt": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"), "protocol": "Each fresh Node/Bun child imports the same TS driver and source port, verifies an exact mode preflight, runs one uncounted same-process warmup, times a second operation, then validates its output outside the timer. In matcher mode the exact SHA-256 raw (text, UTF-16 start) digest runs both before and after the operation; operationMs times only fields (text.length + match.index), never SHA. Token/full guards likewise hash after the timer. 8 per-mode ABBA/BAAB blocks; child observedWall includes runtime startup/TS stripping/import, operationMs does not.", "input": {"request": str(REQUEST), "requestSha256": hashlib.sha256(REQUEST.read_bytes()).hexdigest()}, "environment": {"python": platform.python_version(), "platform": platform.platform(), "cpuCount": os.cpu_count()}, "results": results, "rows": rows, "driverSha256": hashlib.sha256(DRIVER.read_bytes()).hexdigest()}, indent=2))
