"""Serial fresh-process pairs; output directory must be new. No Product source writes."""
import csv
import json
import pathlib
import statistics
import subprocess
import sys
import time

owner = pathlib.Path(__file__).resolve().parent
pack = pathlib.Path(sys.argv[1]).resolve()
output = pathlib.Path(sys.argv[2]).resolve()
output.mkdir(exist_ok=False)
rows = []
for runtime in ["bun", "node"]:
    for pair in range(5):
        modes = ["momoa", "native"] if pair % 2 == 0 else ["native", "momoa"]
        for position, mode in enumerate(modes):
            command = ["mise", "exec", "--", runtime]
            if runtime == "bun":
                command.append("run")
            command += [str(owner / "worker.ts"), mode, str(pack)]
            started = time.perf_counter()
            completed = subprocess.run(command, text=True, capture_output=True)
            label = f"{runtime}-{pair}-{mode}"
            (output / f"{label}.stdout.log").write_text(completed.stdout)
            (output / f"{label}.stderr.log").write_text(completed.stderr)
            if completed.returncode != 0:
                raise RuntimeError(f"{label} failed: {completed.returncode}")
            process_wall_ms = (time.perf_counter() - started) * 1000
            for line in completed.stdout.splitlines():
                row = json.loads(line)
                rows.append({"host": runtime, "pair": pair, "position": position,
                             "processWallMs": process_wall_ms, **row})
            print(label, "completed", flush=True)
with (output / "samples.csv").open("x", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
summary = []
for runtime in ["bun", "node"]:
    for workload in sorted({row["workload"] for row in rows}):
        item = {"host": runtime, "workload": workload}
        for mode in ["momoa", "native"]:
            samples = [row for row in rows if row["host"] == runtime
                       and row["workload"] == workload and row["mode"] == mode
                       and not row["warmup"]]
            assert len(samples) == 5
            item[mode] = {"wallMedianMs": statistics.median(row["wallMs"] for row in samples),
                          "wallMinMs": min(row["wallMs"] for row in samples),
                          "wallMaxMs": max(row["wallMs"] for row in samples),
                          "cpuMedianMs": statistics.median(row["cpuMs"] for row in samples),
                          "documents": samples[0]["documents"], "bytes": samples[0]["bytes"]}
        summary.append(item)
(output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
