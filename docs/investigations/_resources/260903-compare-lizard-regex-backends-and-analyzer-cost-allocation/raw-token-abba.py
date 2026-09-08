"""Alternating raw-token comparison; run with the request JSON as argv[1]."""
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("usage: raw-token-abba.py <request.json>")

REQUEST = sys.argv[1]
HERE = Path(__file__).parent
ROOT = HERE.parents[3]
EXPECTED = {
    "chars": 1127427,
    "count": 295156,
    "digest": "a3a71bd5022b4d6b9f15d2bd24b4947ff9e3c61d7395794be82042b3635fff98",
}


def run_one(runtime: str) -> float:
    command = (
        ["bun", str(HERE / "raw-token-bun.ts"), REQUEST]
        if runtime == "typescript"
        else [
            "env",
            "PYTHONPATH=/tmp/vibe-lizard-1.24.0-308b1c3",
            "/tmp/lizard-1.24-venv/bin/python",
            str(HERE / "raw-token-python.py"),
            REQUEST,
        ]
    )
    result = json.loads(subprocess.check_output(command, cwd=ROOT, text=True))
    if {key: result[key] for key in EXPECTED} != EXPECTED:
        raise RuntimeError(f"raw token guard drift: {runtime}: {result}")
    return result["ms"]


def quantile(values: list[float], probability: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower, upper = math.floor(position), math.ceil(position)
    return ordered[lower] * (upper - position) + ordered[upper] * (position - lower)


rows: list[dict[str, float | int | str]] = []
for block in range(1, 9):
    order = (
        ["python", "typescript", "typescript", "python"]
        if block % 2
        else ["typescript", "python", "python", "typescript"]
    )
    for runtime in order:
        rows.append({"block": block, "runtime": runtime, "ms": run_one(runtime)})

ratios = []
for block in range(1, 9):
    python = [row["ms"] for row in rows if row["block"] == block and row["runtime"] == "python"]
    typescript = [
        row["ms"] for row in rows if row["block"] == block and row["runtime"] == "typescript"
    ]
    python_geomean = math.sqrt(python[0] * python[1])
    typescript_geomean = math.sqrt(typescript[0] * typescript[1])
    ratios.append(python_geomean / typescript_geomean)

print(
    json.dumps(
        {
            "guard": EXPECTED,
            "protocol": "8 ABBA/BAAB blocks; each fresh child performs an uncounted raw warmup, then the timed raw token materialization; child startup/import and post-timing digest are excluded.",
            "rows": rows,
            "pairedPythonDividedByTypescriptMedian": quantile(ratios, 0.5),
            "scriptSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        },
        indent=2,
    )
)
