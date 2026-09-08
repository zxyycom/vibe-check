import json
import math
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
DRIVER = Path(__file__).with_name("node-bun-import-smoke.ts")
RUNTIMES = ("node", "bun")


def quantile(values: list[float], probability: float) -> float:
    ordered = sorted(values)
    index = (len(ordered) - 1) * probability
    lower, upper = int(index), math.ceil(index)
    return ordered[lower] * (upper - index) + ordered[upper] * (index - lower)


def summary(values: list[float]) -> dict:
    return {
        "n": len(values),
        "medianMs": quantile(values, 0.5),
        "p10Ms": quantile(values, 0.1),
        "p90Ms": quantile(values, 0.9),
        "minMs": min(values),
        "maxMs": max(values),
    }


def run(runtime: str) -> dict:
    started = time.monotonic_ns()
    completed = subprocess.run(
        [runtime, str(DRIVER)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return {
        "runtime": runtime,
        "observedWallMs": (time.monotonic_ns() - started) / 1_000_000,
        "identity": json.loads(completed.stdout),
    }


rows = []
for block in range(1, 9):
    order = ("node", "bun", "bun", "node") if block % 2 else ("bun", "node", "node", "bun")
    for runtime in order:
        row = run(runtime)
        row["block"] = block
        rows.append(row)
        print(block, runtime, row["observedWallMs"], file=sys.stderr, flush=True)

per_runtime = {
    runtime: {
        "summary": summary(
            [row["observedWallMs"] for row in rows if row["runtime"] == runtime]
        ),
        "identity": next(row["identity"] for row in rows if row["runtime"] == runtime),
    }
    for runtime in RUNTIMES
}
paired_ratios = []
for block in range(1, 9):
    node_rows = [
        row["observedWallMs"]
        for row in rows
        if row["block"] == block and row["runtime"] == "node"
    ]
    bun_rows = [
        row["observedWallMs"]
        for row in rows
        if row["block"] == block and row["runtime"] == "bun"
    ]
    paired_ratios.append(
        math.sqrt(node_rows[0] * node_rows[1]) / math.sqrt(bun_rows[0] * bun_rows[1])
    )

print(
    json.dumps(
        {
            "protocol": "8 fresh-process ABBA/BAAB blocks. Parent wall surrounds only process start, loading/evaluating the identical two TypeScript analyzer modules, JSON ready output and exit; it is not an in-process operation or Product startup.",
            "perRuntime": per_runtime,
            "pairedNodeDividedByBunMedian": quantile(paired_ratios, 0.5),
            "rows": rows,
        },
        indent=2,
    )
)
