"""One-off, read-only workload profiler for the 2026-10-23 Gate investigation.

Outputs stay in this ignored experiment directory. No environment values or
unrelated command lines are recorded. Sampling is observational, not acceptance.
"""

import json
import os
from pathlib import Path
import resource
import signal
import subprocess
import sys
import time


ROOT = Path.cwd()
OUTPUT = ROOT / ".log/gate-lint-investigation-20261023"
INVOCATIONS = json.loads((OUTPUT / "invocations.json").read_text())
CLOCK_TICKS = os.sysconf("SC_CLK_TCK")
PAGE_BYTES = os.sysconf("SC_PAGE_SIZE")
SAMPLE_SECONDS = 0.1


def cgroup_snapshot():
    base = Path("/sys/fs/cgroup")
    cpu = dict(line.split() for line in (base / "cpu.stat").read_text().splitlines())
    pressure = {}
    for category in ("cpu", "memory", "io"):
        for line in (base / f"{category}.pressure").read_text().splitlines():
            kind, *fields = line.split()
            pressure[f"{category}.{kind}"] = int(dict(field.split("=") for field in fields)["total"])
    memory = dict(line.split() for line in (base / "memory.events").read_text().splitlines())
    memory_stats = dict(line.split() for line in (base / "memory.stat").read_text().splitlines())
    return {"cpu": {key: int(value) for key, value in cpu.items()}, "pressure": pressure,
            "memoryEvents": {key: int(value) for key, value in memory.items()},
            "memoryCounters": {key: int(memory_stats[key]) for key in
                               ("pgscan_direct", "pgsteal_direct", "pgmajfault", "workingset_refault_file")}}


def process_snapshot(root_pids, known_pids):
    processes = {}
    for directory in Path("/proc").iterdir():
        if not directory.name.isdigit():
            continue
        try:
            raw = (directory / "stat").read_text()
        except (FileNotFoundError, ProcessLookupError):
            continue
        close = raw.rindex(")")
        fields = raw[close + 2:].split()
        pid = int(directory.name)
        processes[pid] = {
            "pid": pid, "ppid": int(fields[1]),
            "name": raw[raw.index("(") + 1:close],
            "startTicks": int(fields[19]),
            "cpuMs": (int(fields[11]) + int(fields[12])) * 1000 / CLOCK_TICKS,
            "userMs": int(fields[11]) * 1000 / CLOCK_TICKS,
            "systemMs": int(fields[12]) * 1000 / CLOCK_TICKS,
            "majorFaults": int(fields[9]),
            "threads": int(fields[17]),
            "rssBytes": int(fields[21]) * PAGE_BYTES,
        }
    owned = set(root_pids) | {pid for pid in known_pids if pid in processes}
    while True:
        children = {pid for pid, process in processes.items() if process["ppid"] in owned}
        expanded = owned | children
        if expanded == owned:
            break
        owned = expanded
    return [processes[pid] for pid in sorted(owned) if pid in processes]


def command_for(name):
    if name == "fast":
        return ["bun", "run", "check"]
    invocation = INVOCATIONS[name]
    return [invocation["command"], *invocation["args"]]


def run_scenario(label, lanes, command_env=None):
    """Each lane is a serial command chain; lanes start concurrently."""
    scenario_dir = OUTPUT / label
    scenario_dir.mkdir(exist_ok=False)
    start = time.monotonic()
    cpu_before = resource.getrusage(resource.RUSAGE_CHILDREN)
    observer_before = resource.getrusage(resource.RUSAGE_SELF)
    cgroup_before = cgroup_snapshot()
    active = {}
    executions = []
    known_pids = set()
    samples = []
    output_files = []

    def launch(lane, step):
        name = lanes[lane][step]
        stdout = (scenario_dir / f"{lane}-{step}-{name}.stdout").open("wb")
        stderr = (scenario_dir / f"{lane}-{step}-{name}.stderr").open("wb")
        output_files.extend([stdout, stderr])
        command = command_for(name)
        process = subprocess.Popen(
            command, cwd=ROOT, env={**os.environ, **INVOCATIONS["plainTextEnv"],
                                   **(command_env or {}).get(name, {})},
            stdout=stdout, stderr=stderr, start_new_session=True,
        )
        execution = {"name": name, "lane": lane, "step": step, "pid": process.pid,
                     "command": command, "startMs": (time.monotonic() - start) * 1000}
        active[lane] = (step, process, execution)
        executions.append(execution)

    timed_out = False
    try:
        for lane in range(len(lanes)):
            launch(lane, 0)
        while active:
            now = time.monotonic()
            if now - start > 90:
                timed_out = True
                break
            processes = process_snapshot([entry[1].pid for entry in active.values()], known_pids)
            known_pids.update(process["pid"] for process in processes)
            samples.append({"elapsedMs": (now - start) * 1000, "processes": processes,
                            "cgroupMemoryBytes": int(Path("/sys/fs/cgroup/memory.current").read_text())})
            for lane, (step, process, execution) in list(active.items()):
                code = process.poll()
                if code is None:
                    continue
                execution.update(exitCode=code, endMs=(time.monotonic() - start) * 1000)
                execution["wallMs"] = execution["endMs"] - execution["startMs"]
                del active[lane]
                if step + 1 < len(lanes[lane]):
                    launch(lane, step + 1)
            if active:
                time.sleep(SAMPLE_SECONDS)
    finally:
        for _, process, _ in active.values():
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGKILL)
            process.wait()
        for output in output_files:
            output.close()

    cgroup_after = cgroup_snapshot()
    cpu_after = resource.getrusage(resource.RUSAGE_CHILDREN)
    observer_after = resource.getrusage(resource.RUSAGE_SELF)
    summaries = {}
    for sample in samples:
        for process in sample["processes"]:
            identity = f"{process['pid']}:{process['startTicks']}"
            summary = summaries.setdefault(identity, {
                "pid": process["pid"], "ppid": process["ppid"], "name": process["name"],
                "firstSeenMs": sample["elapsedMs"], "lastSeenMs": sample["elapsedMs"],
                "observedCpuMs": 0, "maxThreads": 0, "maxRssBytes": 0,
                "observedUserMs": 0, "observedSystemMs": 0, "observedMajorFaults": 0,
            })
            summary.update(lastSeenMs=sample["elapsedMs"],
                           observedCpuMs=max(summary["observedCpuMs"], process["cpuMs"]),
                           maxThreads=max(summary["maxThreads"], process["threads"]),
                           maxRssBytes=max(summary["maxRssBytes"], process["rssBytes"]),
                           observedUserMs=max(summary["observedUserMs"], process["userMs"]),
                           observedSystemMs=max(summary["observedSystemMs"], process["systemMs"]),
                           observedMajorFaults=max(summary["observedMajorFaults"], process["majorFaults"]))
    result = {
        "label": label, "lanes": lanes, "commandEnv": command_env or {},
        "wallMs": (time.monotonic() - start) * 1000,
        "timedOut": timed_out, "executions": executions,
        "childUserMs": (cpu_after.ru_utime - cpu_before.ru_utime) * 1000,
        "childSystemMs": (cpu_after.ru_stime - cpu_before.ru_stime) * 1000,
        "observerCpuMs": ((observer_after.ru_utime + observer_after.ru_stime) -
                          (observer_before.ru_utime + observer_before.ru_stime)) * 1000,
        "cgroupDelta": {category: {key: value - cgroup_before[category][key]
                                   for key, value in counters.items()}
                        for category, counters in cgroup_after.items()},
        "processes": list(summaries.values()),
        "maxCgroupMemoryBytes": max(sample["cgroupMemoryBytes"] for sample in samples),
    }
    (scenario_dir / "samples.json").write_text(json.dumps(samples, indent=2) + "\n")
    (scenario_dir / "summary.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key != "processes"}), flush=True)
    if timed_out:
        raise TimeoutError(f"Diagnostic scenario {label} exceeded 90 seconds")


SCENARIOS = {
    "fast-profile": [["fast"]],
    "serial-a": [["lintProduct", "lintScripts"]],
    "pair-a": [["lintProduct"], ["lintScripts"]],
    "third-a": [["lintProduct"], ["lintScripts"], ["selection", "typecheckProduct", "typecheckScripts", "format"]],
    "third-b": [["lintProduct"], ["lintScripts"], ["selection", "typecheckProduct", "typecheckScripts", "format"]],
    "pair-b": [["lintProduct"], ["lintScripts"]],
    "serial-b": [["lintProduct", "lintScripts"]],
}

for label in ("third-control-c", "third-two-a", "third-two-b", "third-control-d"):
    SCENARIOS[label] = SCENARIOS["third-a"]


if __name__ == "__main__":
    for scenario in sys.argv[1:]:
        overrides = {}
        if scenario in ("third-two-a", "third-two-b"):
            overrides = {name: {"GOMAXPROCS": "2"} for name in ("lintProduct", "lintScripts")}
        run_scenario(scenario, SCENARIOS[scenario], overrides)
