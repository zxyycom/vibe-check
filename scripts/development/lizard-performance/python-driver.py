"""Pinned Lizard API driver used only by the opt-in development benchmark."""
import json
import sys
import time
import lizard
from lizard_ext.version import version as lizard_version

warmup = "--warmup" in sys.argv
request_path = next(argument for argument in sys.argv[1:] if argument != "--warmup")
request = json.load(open(request_path, encoding="utf-8"))
def analyze():
    metrics = []
    for source in request["files"]:
        info = lizard.analyze_file.analyze_source_code(source["path"], source["source"])
        for function in info.function_list:
            metrics.append({
            "ccn": function.cyclomatic_complexity,
            "endLine": function.end_line,
            "file": source["path"],
            "name": function.name,
            "nloc": function.nloc,
            "parameterCount": function.parameter_count,
                "startLine": function.start_line,
            })
    return metrics
if warmup:
    analyze()
started = time.monotonic_ns()
metrics = analyze()
operation_wall_ms = (time.monotonic_ns() - started) / 1_000_000
print(json.dumps({"lizardVersion": lizard_version, "metrics": metrics, "operationWallMs": operation_wall_ms, "pythonExecutable": sys.executable}, separators=(",", ":")))
