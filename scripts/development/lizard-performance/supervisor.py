"""Linux direct-child resource supervisor; it never pretends to aggregate descendants."""
import json
import os
import resource
import subprocess
import sys
import tempfile
import time

if sys.platform != "linux":
    raise SystemExit("lizard performance supervisor is supported only on Linux")

command = json.loads(sys.argv[1])
started = time.monotonic_ns()
# A pipe can deadlock when a large benchmark result fills it before wait4. Files
# preserve target output while allowing Linux wait4 to collect its rusage first.
with tempfile.TemporaryFile() as stdout_file, tempfile.TemporaryFile() as stderr_file:
    child = subprocess.Popen(command, stdout=stdout_file, stderr=stderr_file)
    _, status, usage = os.wait4(child.pid, 0)
    stdout_file.seek(0)
    stderr_file.seek(0)
    stdout = stdout_file.read().decode("utf-8", errors="replace")
    stderr = stderr_file.read().decode("utf-8", errors="replace")
wall_ms = (time.monotonic_ns() - started) / 1_000_000
# Linux ru_maxrss is KiB. wait4 covers the target and descendants it reaps; RSS
# remains one maximum rather than an aggregate process-tree value.
result = {
    "exitCode": os.waitstatus_to_exitcode(status),
    "resource": {
        "cpuScope": "target-process-plus-reaped-descendants; Linux wait4",
        "peakRssBytes": usage.ru_maxrss * 1024,
        "peakRssScope": "max-single-process-rss; Linux wait4 ru_maxrss KiB; not tree aggregate",
        "systemCpuMs": usage.ru_stime * 1000,
        "unit": "bytes",
        "userCpuMs": usage.ru_utime * 1000,
    },
    "stderr": stderr,
    "stdout": stdout,
    "wallMs": wall_ms,
}
print(json.dumps(result, separators=(",", ":")))
