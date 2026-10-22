"""Print statistics from this Change's raw JSON; never rewrite its historical evidence report."""

import json
import statistics
from pathlib import Path


CHANGE_DIRECTORY = Path(__file__).resolve().parent
TEST_WORKLOAD_NAMES = ("fingerprintTests", "validationLane")


def load_measurements(stage):
    measurement_path = CHANGE_DIRECTORY / f"{stage}-measurements.json"
    with measurement_path.open(encoding="utf-8") as source:
        measurements = json.load(source)
    if measurements["stage"] != stage:
        raise ValueError(f"{measurement_path}: expected stage {stage!r}")
    return measurements


def measured_samples(samples):
    return [sample for sample in samples if not sample["warmup"]]


def format_median_range(durations_ms):
    median_ms = statistics.median(durations_ms)
    return f"{median_ms:.2f} [{min(durations_ms):.2f}–{max(durations_ms):.2f}]"


def render_statistics(before, after):
    before_copy = measured_samples(before["copy"])
    after_copy = measured_samples(after["copy"])
    lines = [
        "# 原始测量统计摘要",
        "",
        "仅从 before/after-measurements.json 计算；排除 warmup，区间为最小值–最大值。",
        "本摘要不重建历史实现、验证结论或完整 Gate 收益。",
        "",
        f"有效复制样本：before {len(before_copy)}；after {len(after_copy)}。",
        "",
        "| frozen helper | before median [range] ms | after median [range] ms |",
        "| --- | --- | --- |",
    ]
    for metric in ("copyMs", "cleanupMs"):
        before_durations = [sample[metric] for sample in before_copy]
        after_durations = [sample[metric] for sample in after_copy]
        lines.append(
            f"| {metric} | {format_median_range(before_durations)}"
            f" | {format_median_range(after_durations)} |"
        )
    before_total = [sample["copyMs"] + sample["cleanupMs"] for sample in before_copy]
    after_total = [sample["copyMs"] + sample["cleanupMs"] for sample in after_copy]
    lines.append(
        f"| copy+cleanup | {format_median_range(before_total)}"
        f" | {format_median_range(after_total)} |"
    )
    before_inventory = before["copy"][0]
    after_inventory = after["copy"][0]
    lines.extend(
        [
            "",
            f"复制数量（首样本）：{before_inventory['files']}→{after_inventory['files']} 文件；"
            f"{before_inventory['bytes']}→{after_inventory['bytes']} bytes。",
            "",
            "| 完整测试入口 | measured before/after | before median [range] ms"
            " | after median [range] ms | observed median reduction |",
            "| --- | --- | --- | --- | --- |",
        ]
    )
    before_tests = measured_samples(before["tests"])
    after_tests = measured_samples(after["tests"])
    for workload_name in TEST_WORKLOAD_NAMES:
        before_durations = [
            sample["wallMs"] for sample in before_tests if sample["name"] == workload_name
        ]
        after_durations = [
            sample["wallMs"] for sample in after_tests if sample["name"] == workload_name
        ]
        reduction_percent = (
            1 - statistics.median(after_durations) / statistics.median(before_durations)
        ) * 100
        lines.append(
            f"| {workload_name} | {len(before_durations)}/{len(after_durations)}"
            f" | {format_median_range(before_durations)}"
            f" | {format_median_range(after_durations)} | {reduction_percent:.1f}% |"
        )
    return "\n".join(lines)


def main():
    before = load_measurements("before")
    after = load_measurements("after")
    print(render_statistics(before, after))


if __name__ == "__main__":
    main()
