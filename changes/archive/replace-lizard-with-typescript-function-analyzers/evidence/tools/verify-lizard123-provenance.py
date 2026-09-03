#!/usr/bin/env python3
"""Fail closed when the curated Lizard 1.23 provenance ledger drifts."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import zipfile
from collections import defaultdict
from collections.abc import Iterable
from typing import Never

EVIDENCE = pathlib.Path(__file__).resolve().parents[1]
ROOT = EVIDENCE.parents[3]
DEFAULT_SOURCE_ROOT = pathlib.Path("/tmp/lizard-1.23-audit.tUCD0B")
DEFAULT_PYGMENTS_WHEEL = pathlib.Path(
    "/tmp/pygments-2.18.0/pygments-2.18.0-py3-none-any.whl"
)
REVISION = "06284ec87c1966fee4ddbf3f068ccf89b987b0f8"
STATUS_VOCABULARY = {
    "translated",
    "deferred-extension-body",
    "excluded-entry-surface",
}
RANGE = re.compile(r"^lines ([1-9][0-9]*)-([1-9][0-9]*)$")
DEFERRED_SUPPORTS = {
    "lizard_ext/default_ordered_dict.py",
    "lizard_ext/keywords.py",
}
DEFERRED_BODIES = {
    "lizard_ext/lizardboolcount.py",
    "lizard_ext/lizardcomplextags.py",
    "lizard_ext/lizardcpre.py",
    "lizard_ext/lizarddependencycount.py",
    "lizard_ext/lizarddumpcomments.py",
    "lizard_ext/lizardduplicate.py",
    "lizard_ext/lizardduplicated_param_list.py",
    "lizard_ext/lizardexitcount.py",
    "lizard_ext/lizardgotocount.py",
    "lizard_ext/lizardignoreassert.py",
    "lizard_ext/lizardio.py",
    "lizard_ext/lizardmccabe.py",
    "lizard_ext/lizardmodified.py",
    "lizard_ext/lizardnd.py",
    "lizard_ext/lizardnonstrict.py",
    "lizard_ext/lizardns.py",
    "lizard_ext/lizardoutside.py",
    "lizard_ext/lizardstatementcount.py",
    "lizard_ext/lizardwordcount.py",
}
PYGMENTS = {
    "project": "Pygments",
    "version": "2.18.0",
    "filename": "pygments-2.18.0-py3-none-any.whl",
    "url": "https://files.pythonhosted.org/packages/f7/3f/01c8b82017c199075f8f788d0d906b9ffbbc5a47dc9918a945e13d5a2bda/pygments-2.18.0-py3-none-any.whl",
    "wheel_sha256": "b8e6aca0523f3ab76fee51799c488e38782ac06eafcf95e7ba832985c8e7b13a",
    "source_path": "pygments/lexers/erlang.py",
    "source_sha256": "df15549a76ef81b40de10339586bc8a103054bd8c9a6d04244cdcc3f82b1b19a",
    "license_path": "pygments-2.18.0.dist-info/licenses/LICENSE",
    "license_sha256": "a9d66f1d526df02e29dce73436d34e56e8632f46c275bbdffc70569e882f9f17",
    "target_path": "src/package-checks/function-metrics/analyzer/readers/erlang.ts",
}
PACKAGE_LEGAL = {
    "notice": ROOT / "THIRD_PARTY_NOTICES.md",
    "provenance": ROOT / "licenses/lizard-1.23.0-provenance.json",
    "mit": ROOT / "licenses/Lizard-1.23.0-MIT.txt",
    "apache": ROOT / "licenses/Lizard-1.23.0-lizard.py-Apache-2.0.txt",
    "pygments": ROOT / "licenses/Pygments-2.18.0-BSD-2-Clause.txt",
}
PACKAGE_LEGAL_SHA256 = {
    "mit": "d39663810f02975743f69d01856f93c7391ce6b842a20189544b9fd464f663f3",
    "apache": "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30",
    "pygments": PYGMENTS["license_sha256"],
}
PACKAGE_LICENSE_PATHS = {
    "MIT": PACKAGE_LEGAL["mit"],
    "Apache-2.0": PACKAGE_LEGAL["apache"],
    "BSD-2-Clause": PACKAGE_LEGAL["pygments"],
}
TRANSLATED_SOURCE_HEADER = "Derived from terryyin/lizard 1.23.0."
LIZARD_TRANSLATED_SYMBOL_RANGES = {
    "analyze_files": ("lines 91-98", "src/package-checks/function-metrics/analyzer/core.ts"),
    "FileAnalyzer.analyze_source_code": (
        "lines 607-620",
        "src/package-checks/function-metrics/analyzer/core.ts",
    ),
    "map_files_to_analyzer": (
        "lines 623-625",
        "src/package-checks/function-metrics/analyzer/core.ts",
    ),
    "OutputScheme": ("lines 681-788", "src/package-checks/function-metrics/analyzer/core.ts"),
    "set_args lifecycle": ("lines 1012-1022", "src/package-checks/function-metrics/analyzer/core.ts"),
    "print_extension_results": (
        "lines 1155-1158",
        "src/package-checks/function-metrics/analyzer/core.ts",
    ),
}


def fail(message: str) -> Never:
    raise ValueError(message)


def git_output(source_root: pathlib.Path, *arguments: str) -> str:
    return subprocess.check_output(
        ["git", "-C", str(source_root), *arguments], text=True
    ).strip()


def source_line_count(path: pathlib.Path) -> int:
    return len(path.read_text(encoding="utf-8").splitlines())


def source_digest(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_range(entry: dict[str, object]) -> tuple[int, int]:
    value = entry.get("range")
    if not isinstance(value, str):
        fail(f"{entry.get('sourcePath')}: range must be a string")
    match = RANGE.fullmatch(value)
    if match is None:
        fail(f"{entry.get('sourcePath')}: invalid inclusive range {value!r}")
    start, end = (int(part) for part in match.groups())
    if start > end:
        fail(f"{entry.get('sourcePath')}: range starts after it ends")
    return start, end


def target_paths(entry: dict[str, object]) -> Iterable[str]:
    target = entry.get("targetPath")
    if target is not None:
        if not isinstance(target, str):
            fail(f"{entry['sourcePath']}: targetPath must be a string")
        yield target
    additional = entry.get("additionalTargetPaths", [])
    if not isinstance(additional, list) or not all(isinstance(path, str) for path in additional):
        fail(f"{entry['sourcePath']}: additionalTargetPaths must be an array of strings")
    yield from additional


def verify_source_checkout(source_root: pathlib.Path) -> None:
    if not source_root.is_dir():
        fail(f"missing fixed Lizard checkout: {source_root}")
    if git_output(source_root, "rev-parse", "HEAD") != REVISION:
        fail(f"{source_root}: checkout is not fixed revision {REVISION}")
    if git_output(source_root, "status", "--porcelain"):
        fail(f"{source_root}: checkout must be clean")


def verify_entry(
    entry: dict[str, object], source_root: pathlib.Path, ranges: defaultdict[str, list[tuple[int, int]]]
) -> None:
    source_path = entry.get("sourcePath")
    if not isinstance(source_path, str) or source_path.startswith("/") or ".." in pathlib.PurePosixPath(source_path).parts:
        fail("sourcePath must be a repository-relative source path")
    source = source_root / source_path
    if not source.is_file():
        fail(f"{source_path}: missing from fixed checkout")
    start, end = parse_range(entry)
    if end > source_line_count(source):
        fail(f"{source_path}: range ends after source line {source_line_count(source)}")
    ranges[source_path].append((start, end))
    if entry.get("sha256") != source_digest(source):
        fail(f"{source_path}: source SHA-256 does not match fixed checkout")
    status = entry.get("status")
    if status not in STATUS_VOCABULARY:
        fail(f"{source_path}: unsupported status {status!r}")
    target = entry.get("targetPath")
    paths = list(target_paths(entry))
    if status == "excluded-entry-surface":
        if paths:
            fail(f"{source_path}: excluded entry surface must not name a target")
        return
    if not isinstance(target, str):
        fail(f"{source_path}: {status} entry needs targetPath")
    pending = entry.get("implementationEvidence")
    is_pending = isinstance(pending, str) and pending.startswith("translated-target-pending")
    for target_path in paths:
        resolved = ROOT / target_path
        if resolved.is_file():
            continue
        if status == "translated" and is_pending:
            continue
        if status == "deferred-extension-body":
            continue
        fail(f"{source_path}: target is missing without an explicit pending boundary: {target_path}")
    if status == "translated" and not (ROOT / target).is_file() and not is_pending:
        fail(f"{source_path}: missing translated target is not explicitly pending")


def verify_no_overlaps(ranges: dict[str, list[tuple[int, int]]]) -> None:
    for source_path, source_ranges in ranges.items():
        previous_end = 0
        for start, end in sorted(source_ranges):
            if start <= previous_end:
                fail(f"{source_path}: overlapping source ranges")
            previous_end = end


def verify_lizard_partition(ranges: dict[str, list[tuple[int, int]]]) -> None:
    partition = sorted(ranges.get("lizard.py", []))
    if not partition:
        fail("lizard.py: missing range partition")
    cursor = 1
    for start, end in partition:
        if start != cursor:
            fail(f"lizard.py: partition gap before line {start}")
        cursor = end + 1
    if cursor != 1163:
        fail(f"lizard.py: partition must end at line 1162, ends at {cursor - 1}")


def verify_lizard_symbol_ranges(entries: list[dict[str, object]]) -> None:
    """Keep named translated lizard.py symbols pinned to their exact source ranges."""
    lizard_entries = [entry for entry in entries if entry.get("sourcePath") == "lizard.py"]
    for symbol, (expected_range, expected_target) in LIZARD_TRANSLATED_SYMBOL_RANGES.items():
        matching = [entry for entry in lizard_entries if entry.get("range") == expected_range]
        if len(matching) != 1:
            fail(f"lizard.py: {symbol} must have exactly one {expected_range} ledger entry")
        entry = matching[0]
        if entry.get("status") != "translated" or entry.get("targetPath") != expected_target:
            fail(
                f"lizard.py: {symbol} must be translated at {expected_range} "
                f"to {expected_target}"
            )


def verify_deferred_closure(entries: list[dict[str, object]]) -> None:
    deferred_paths = {
        entry["sourcePath"]
        for entry in entries
        if entry["status"] == "deferred-extension-body"
    }
    if deferred_paths & (DEFERRED_BODIES | DEFERRED_SUPPORTS) != DEFERRED_BODIES | DEFERRED_SUPPORTS:
        fail("deferred extension closure must include all 19 concrete bodies and both support modules")
    unexpected = deferred_paths - DEFERRED_BODIES - DEFERRED_SUPPORTS
    if unexpected:
        fail(f"deferred extension closure has unexpected paths: {sorted(unexpected)}")
    if len(deferred_paths & DEFERRED_BODIES) != 19 or len(deferred_paths & DEFERRED_SUPPORTS) != 2:
        fail("deferred extension closure must contain exactly 19 bodies plus 2 support modules")


def require_string(source: dict[str, object], key: str) -> str:
    value = source.get(key)
    if not isinstance(value, str) or not value:
        fail(f"Pygments supplemental source: {key} must be a non-empty string")
    return value


def verify_pygments_source(
    ledger: dict[str, object], pygments_wheel: pathlib.Path
) -> None:
    sources = ledger.get("supplementalSources")
    if not isinstance(sources, list) or len(sources) != 1 or not isinstance(sources[0], dict):
        fail("provenance ledger must contain exactly one Pygments supplemental source")
    source = sources[0]
    distribution = source.get("distribution")
    if not isinstance(distribution, dict):
        fail("Pygments supplemental source: distribution must be an object")
    expected_distribution = {
        "filename": PYGMENTS["filename"],
        "url": PYGMENTS["url"],
        "sha256": PYGMENTS["wheel_sha256"],
    }
    if source.get("project") != PYGMENTS["project"] or source.get("version") != PYGMENTS["version"]:
        fail("Pygments supplemental source: project or version drifted")
    if distribution != expected_distribution:
        fail("Pygments supplemental source: fixed distribution identity drifted")
    if require_string(source, "sourcePath") != PYGMENTS["source_path"]:
        fail("Pygments supplemental source: source path drifted")
    if source.get("sha256") != PYGMENTS["source_sha256"]:
        fail("Pygments supplemental source: source SHA-256 drifted")
    if source.get("licensePath") != PYGMENTS["license_path"]:
        fail("Pygments supplemental source: license path drifted")
    if source.get("licenseSha256") != PYGMENTS["license_sha256"]:
        fail("Pygments supplemental source: license SHA-256 drifted")
    if source.get("spdx") != "BSD-2-Clause" or source.get("status") != "translated":
        fail("Pygments supplemental source: SPDX or translated status drifted")
    if source.get("targetPath") != PYGMENTS["target_path"]:
        fail("Pygments supplemental source: target path drifted")
    target = ROOT / PYGMENTS["target_path"]
    if not target.is_file():
        fail("Pygments supplemental source: Erlang target is missing")
    require_string(source, "boundary")
    require_string(source, "implementationEvidence")
    require_string(source, "verification")
    require_string(source, "headerRequirement")

    if not pygments_wheel.is_file():
        fail(f"missing fixed Pygments wheel: {pygments_wheel}")
    if source_digest(pygments_wheel) != PYGMENTS["wheel_sha256"]:
        fail(f"{pygments_wheel}: wheel SHA-256 does not match Pygments 2.18.0")
    try:
        with zipfile.ZipFile(pygments_wheel) as wheel:
            metadata = wheel.read("pygments-2.18.0.dist-info/METADATA").decode("utf-8")
            source_bytes = wheel.read(PYGMENTS["source_path"])
            license_bytes = wheel.read(PYGMENTS["license_path"])
    except (KeyError, zipfile.BadZipFile) as error:
        fail(f"{pygments_wheel}: cannot read fixed Pygments source: {error}")
    if "Name: Pygments\n" not in metadata or "Version: 2.18.0\n" not in metadata:
        fail(f"{pygments_wheel}: wheel metadata is not Pygments 2.18.0")
    if hashlib.sha256(source_bytes).hexdigest() != PYGMENTS["source_sha256"]:
        fail(f"{pygments_wheel}: Erlang lexer source SHA-256 drifted")
    if hashlib.sha256(license_bytes).hexdigest() != PYGMENTS["license_sha256"]:
        fail(f"{pygments_wheel}: BSD-2-Clause license SHA-256 drifted")
    start, end = parse_range(source)
    if end > len(source_bytes.decode("utf-8").splitlines()):
        fail("Pygments supplemental source: range ends after lexer source")
    target_header = target.read_text(encoding="utf-8").split("*/", 1)[0]
    required_header_fragments = (
        "Derived from terryyin/lizard 1.23.0.",
        "lizard_languages/erlang.py (MIT)",
        "Pygments 2.18.0",
        "pygments/lexers/erlang.py (BSD-2-Clause)",
        "Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.",
        "SPDX-License-Identifier: MIT AND BSD-2-Clause",
        "Modified:",
    )
    if any(fragment not in target_header for fragment in required_header_fragments):
        fail("Pygments supplemental source: Erlang target lacks the required dual-source header")

    legal = json.loads(
        (EVIDENCE / "lizard-1.23-legal-inventory-input.json").read_text(encoding="utf-8")
    )
    inputs = legal.get("licenseInputs")
    if not isinstance(inputs, list):
        fail("legal inventory input: licenseInputs must be an array")
    required_path = f"{PYGMENTS['filename']}::{PYGMENTS['source_path']}"
    matching = [
        item
        for item in inputs
        if isinstance(item, dict) and item.get("path") == required_path
    ]
    if len(matching) != 1:
        fail("legal inventory input: missing or duplicate Pygments Erlang source")
    legal_source = matching[0]
    required_legal_fields = {
        "distributionUrl": PYGMENTS["url"],
        "distributionSha256": PYGMENTS["wheel_sha256"],
        "sourceSha256": PYGMENTS["source_sha256"],
        "range": source["range"],
        "spdx": "BSD-2-Clause",
        "targetPath": PYGMENTS["target_path"],
        "licensePath": PYGMENTS["license_path"],
        "licenseSha256": PYGMENTS["license_sha256"],
        "requiredNoticePath": "THIRD_PARTY_NOTICES.md",
        "requiredLicenseTextPath": "licenses/Pygments-2.18.0-BSD-2-Clause.txt",
    }
    if any(legal_source.get(key) != value for key, value in required_legal_fields.items()):
        fail("legal inventory input: Pygments Erlang source fields drifted")
    require_string(legal_source, "requiredDerivedHeader")


def package_relative(path: pathlib.Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        fail(f"package material escapes repository root: {path}")


def require_package_material(name: str) -> pathlib.Path:
    path = PACKAGE_LEGAL[name]
    if not path.is_file():
        fail(f"package legal material is missing: {package_relative(path)}")
    return path


def target_header(target_path: str) -> str:
    target = ROOT / target_path
    if not target.is_file():
        fail(f"translated target is missing: {target_path}")
    source = target.read_text(encoding="utf-8")
    if not source.startswith("/**") or "*/" not in source:
        fail(f"translated target lacks a leading source header: {target_path}")
    return source.split("*/", 1)[0]


def header_spdx_identifiers(header: str, target_path: str) -> set[str]:
    match = re.search(r"SPDX-License-Identifier:\s*([^\r\n*]+)", header)
    if match is None:
        fail(f"translated target lacks SPDX header: {target_path}")
    identifiers = {identifier.strip() for identifier in match.group(1).split(" AND ")}
    if not identifiers or any(identifier not in PACKAGE_LICENSE_PATHS for identifier in identifiers):
        fail(f"translated target has unsupported SPDX header: {target_path}")
    return identifiers


def package_source_path(path: pathlib.Path) -> bool:
    relative = package_relative(path)
    return (
        relative.startswith("src/")
        and relative.endswith(".ts")
        and not relative.endswith(".test.ts")
        and not relative.endswith(".test-support.ts")
        and not relative.endswith("bun-test.d.ts")
        and "/fixtures/" not in relative
    )


def verify_translated_target_headers(ledger: dict[str, object]) -> None:
    entries = ledger.get("files")
    supplemental = ledger.get("supplementalSources")
    if not isinstance(entries, list) or not isinstance(supplemental, list):
        fail("provenance ledger lacks translated target inputs")
    sources_by_target: dict[str, list[dict[str, object]]] = defaultdict(list)
    for entry in [*entries, *supplemental]:
        if not isinstance(entry, dict) or entry.get("status") != "translated":
            continue
        for target_path in target_paths(entry):
            sources_by_target[target_path].append(entry)
    if len(sources_by_target) != 37:
        fail("provenance ledger must close exactly 37 translated package targets")

    for target_path, sources in sources_by_target.items():
        header = target_header(target_path)
        if TRANSLATED_SOURCE_HEADER not in header:
            fail(f"translated target lacks fixed Lizard source header: {target_path}")
        if f"Upstream revision: {REVISION}." not in header or "Modified:" not in header:
            fail(f"translated target lacks revision or modified header: {target_path}")
        header_spdx = header_spdx_identifiers(header, target_path)
        for source in sources:
            source_path = source.get("sourcePath")
            spdx = source.get("spdx")
            if not isinstance(source_path, str) or source_path not in header:
                fail(f"translated target does not identify provenance source {source_path}: {target_path}")
            if not isinstance(spdx, str) or spdx not in header_spdx:
                fail(f"translated target lacks provenance SPDX {spdx}: {target_path}")
        for spdx in header_spdx:
            if not require_package_material(
                "mit" if spdx == "MIT" else "apache" if spdx == "Apache-2.0" else "pygments"
            ).is_file():
                fail(f"translated target has no packaged license text for {spdx}: {target_path}")

    for path in (ROOT / "src").rglob("*.ts"):
        if not package_source_path(path):
            continue
        source = path.read_text(encoding="utf-8")
        if source.startswith("/**") and TRANSLATED_SOURCE_HEADER in source:
            relative = package_relative(path)
            if relative not in sources_by_target:
                fail(f"packaged translated source has no provenance target: {relative}")

    for entry in entries:
        if not isinstance(entry, dict) or entry.get("status") != "deferred-extension-body":
            continue
        for target_path in target_paths(entry):
            if (ROOT / target_path).exists():
                fail(f"deferred extension body is present as source: {target_path}")


def verify_legal_inventory_outputs(
    ledger: dict[str, object], source_root: pathlib.Path, pygments_wheel: pathlib.Path
) -> None:
    provenance = require_package_material("provenance")
    if source_digest(provenance) != source_digest(EVIDENCE / "lizard-1.23-provenance-ledger.json"):
        fail("package provenance inventory does not exactly match curated ledger")

    mit = require_package_material("mit")
    if source_digest(mit) != PACKAGE_LEGAL_SHA256["mit"] or source_digest(mit) != source_digest(
        source_root / "LICENSE.txt"
    ):
        fail("package Lizard MIT text does not match the fixed-tag license")
    apache = require_package_material("apache")
    if source_digest(apache) != PACKAGE_LEGAL_SHA256["apache"]:
        fail("package lizard.py Apache-2.0 text does not match its approved complete text")
    pygments = require_package_material("pygments")
    if source_digest(pygments) != PACKAGE_LEGAL_SHA256["pygments"]:
        fail("package Pygments BSD-2-Clause text has the wrong digest")
    try:
        with zipfile.ZipFile(pygments_wheel) as wheel:
            wheel_license = wheel.read(PYGMENTS["license_path"])
    except (KeyError, zipfile.BadZipFile) as error:
        fail(f"{pygments_wheel}: cannot read fixed Pygments license: {error}")
    if pygments.read_bytes() != wheel_license:
        fail("package Pygments BSD-2-Clause text does not match the fixed wheel")

    notice = require_package_material("notice").read_text(encoding="utf-8")
    required_notice = (
        "Lizard 1.23.0",
        REVISION,
        "Apache-2.0",
        "Pygments 2.18.0",
        "BSD-2-Clause",
        "19 Lizard concrete extension bodies and two extension-only support",
        "licenses/lizard-1.23.0-provenance.json",
    )
    if any(fragment not in notice for fragment in required_notice):
        fail("package third-party notice is incomplete")

    legal = json.loads(
        (EVIDENCE / "lizard-1.23-legal-inventory-input.json").read_text(encoding="utf-8")
    )
    inputs = legal.get("licenseInputs")
    if legal.get("schemaVersion") != 2 or not isinstance(inputs, list):
        fail("legal inventory input is invalid")
    required_outputs = {
        "LICENSE.txt": {
            "licenseSha256": PACKAGE_LEGAL_SHA256["mit"],
            "requiredNoticePath": "THIRD_PARTY_NOTICES.md",
            "requiredLicenseTextPath": "licenses/Lizard-1.23.0-MIT.txt",
        },
        "lizard.py": {
            "licenseSha256": PACKAGE_LEGAL_SHA256["apache"],
            "requiredNoticePath": "THIRD_PARTY_NOTICES.md",
            "requiredLicenseTextPath": "licenses/Lizard-1.23.0-lizard.py-Apache-2.0.txt",
        },
        f"{PYGMENTS['filename']}::{PYGMENTS['source_path']}": {
            "licenseSha256": PACKAGE_LEGAL_SHA256["pygments"],
            "requiredNoticePath": "THIRD_PARTY_NOTICES.md",
            "requiredLicenseTextPath": "licenses/Pygments-2.18.0-BSD-2-Clause.txt",
        },
    }
    for source_path, expected in required_outputs.items():
        matching = [item for item in inputs if isinstance(item, dict) and item.get("path") == source_path]
        if len(matching) != 1 or any(matching[0].get(key) != value for key, value in expected.items()):
            fail(f"legal inventory input does not close package material for {source_path}")

    verify_translated_target_headers(ledger)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=pathlib.Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument("--pygments-wheel", type=pathlib.Path, default=DEFAULT_PYGMENTS_WHEEL)
    arguments = parser.parse_args()
    verify_source_checkout(arguments.source_root)
    ledger = json.loads((EVIDENCE / "lizard-1.23-provenance-ledger.json").read_text(encoding="utf-8"))
    if ledger.get("schemaVersion") != 2:
        fail("provenance ledger must use schemaVersion 2")
    if ledger.get("upstream", {}).get("revision") != REVISION:
        fail("provenance ledger has the wrong upstream revision")
    if set(ledger.get("statusVocabulary", [])) != STATUS_VOCABULARY:
        fail("provenance ledger statusVocabulary drifted")
    entries = ledger.get("files")
    if not isinstance(entries, list) or len(entries) != 79 or not all(isinstance(entry, dict) for entry in entries):
        fail("provenance ledger must contain exactly 79 entries")
    ranges: defaultdict[str, list[tuple[int, int]]] = defaultdict(list)
    for entry in entries:
        verify_entry(entry, arguments.source_root, ranges)
    verify_no_overlaps(ranges)
    verify_lizard_partition(ranges)
    verify_lizard_symbol_ranges(entries)
    verify_deferred_closure(entries)
    verify_pygments_source(ledger, arguments.pygments_wheel)
    verify_legal_inventory_outputs(ledger, arguments.source_root, arguments.pygments_wheel)
    print(
        "Lizard 1.23 provenance verification passed: 79 entries; lizard.py 1-1162 "
        "partitioned; 19+2 deferred closure; translated headers and package legal inventory verified."
    )


if __name__ == "__main__":
    try:
        main()
    except (OSError, subprocess.CalledProcessError, ValueError, json.JSONDecodeError) as error:
        print(f"Lizard 1.23 provenance verification failed: {error}", file=sys.stderr)
        sys.exit(1)
