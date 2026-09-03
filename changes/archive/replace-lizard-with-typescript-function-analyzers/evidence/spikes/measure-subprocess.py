#!/usr/bin/env python3
"""Measure one subprocess's elapsed time and child max RSS without changing product code."""
import json
import resource
import subprocess
import sys
import time

before = resource.getrusage(resource.RUSAGE_CHILDREN)
started = time.perf_counter()
result = subprocess.run(sys.argv[1:], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
after = resource.getrusage(resource.RUSAGE_CHILDREN)
print(json.dumps({
    "command": sys.argv[1:],
    "exitCode": result.returncode,
    "maxRssKiB": max(0, after.ru_maxrss - before.ru_maxrss),
    "stderr": result.stderr,
    "wallMs": (time.perf_counter() - started) * 1000,
}))
