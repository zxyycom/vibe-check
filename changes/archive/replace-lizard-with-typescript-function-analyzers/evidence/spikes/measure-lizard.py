#!/usr/bin/env python3
"""Measure one Lizard subprocess with Linux child rusage; called by the Bun spike."""
import json
import resource
import subprocess
import sys
import time

command, source = sys.argv[1:]
before = resource.getrusage(resource.RUSAGE_CHILDREN)
started = time.perf_counter()
result = subprocess.run([command, source, "--csv"], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
after = resource.getrusage(resource.RUSAGE_CHILDREN)
print(json.dumps({
    "command": [command, source, "--csv"],
    "exitCode": result.returncode,
    "maxRssKiB": max(0, after.ru_maxrss - before.ru_maxrss),
    "stderr": result.stderr,
    "wallMs": (time.perf_counter() - started) * 1000,
}))
