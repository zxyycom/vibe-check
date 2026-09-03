#!/usr/bin/env python3
"""Generate only the Lizard 1.23.0 mapping, fixtures, and oracle observations."""
from __future__ import annotations

import csv
import hashlib
import inspect
import json
import lizard_languages
import argparse
import os
import pathlib
import subprocess
import sys
from collections.abc import Iterable

EVIDENCE = pathlib.Path(__file__).resolve().parents[1]
ROOT = EVIDENCE.parents[3]
SOURCE_ROOT = pathlib.Path(
    os.environ.get("LIZARD_SOURCE_ROOT", "/tmp/lizard-1.23-audit.tUCD0B")
)
FIXTURES = ROOT / "src/package-checks/function-metrics/analyzer/fixtures/lizard-1.23.0"
LIZARD_TAG = "1.23.0"
LIZARD_REVISION = "06284ec87c1966fee4ddbf3f068ccf89b987b0f8"

TEMPLATES = {
    "CLikeReader": "int reader_sample(int value) { if (value > 0) { return 1; } return 0; }\n",
    "JavaReader": "class Sample { int readerSample(int value) { if (value > 0) { return 1; } return 0; } }\n",
    "CSharpReader": "class Sample { int ReaderSample(int value) { if (value > 0) { return 1; } return 0; } }\n",
    "JavaScriptReader": "function readerSample(value) { if (value > 0) { return 1; } return 0; }\n",
    "PythonReader": "def reader_sample(value):\n    if value > 0:\n        return 1\n    return 0\n",
    "ObjCReader": "- (int)readerSample:(int)value { if (value > 0) { return 1; } return 0; }\n",
    "TTCNReader": "function readerSample(in integer value) return integer { if (value > 0) { return 1; } return 0; }\n",
    "RubyReader": "def reader_sample(value)\n  if value > 0\n    return 1\n  end\n  0\nend\n",
    "PHPReader": "<?php\nfunction readerSample($value) { if ($value > 0) { return 1; } return 0; }\n",
    "SwiftReader": "func readerSample(_ value: Int) -> Int { if value > 0 { return 1 }; return 0 }\n",
    "ScalaReader": "def readerSample(value: Int): Int = {\n if (value > 0) { return 1 }\n return 0\n}\n",
    "GDScriptReader": "func reader_sample(value):\n    if value > 0:\n        return 1\n    return 0\n",
    "GoReader": "package sample\nfunc readerSample(value int) int { if value > 0 { return 1 }; return 0 }\n",
    "LuaReader": "function reader_sample(value)\n  if value > 0 then return 1 end\n  return 0\nend\n",
    "RustReader": "fn reader_sample(value: i32) -> i32 { if value > 0 { return 1; } 0 }\n",
    "TypeScriptReader": "function readerSample(value: number): number { if (value > 0) { return 1; } return 0; }\n",
    "FortranReader": "function reader_sample(value) result(answer)\n integer :: value, answer\n if (value .gt. 0) then\n  answer = 1\n else\n  answer = 0\n end if\nend function reader_sample\n",
    "KotlinReader": "fun readerSample(value: Int): Int { if (value > 0) { return 1 }; return 0 }\n",
    "SolidityReader": "contract Sample { function readerSample(uint value) public pure returns (uint) { if (value > 0) { return 1; } return 0; } }\n",
    "ErlangReader": "reader_sample(Value) -> case Value of 0 -> 0; _ -> 1 end.\n",
    "ZigReader": "fn readerSample(value: i32) i32 { if (value > 0) return 1; return 0; }\n",
    "TSXReader": "function ReaderSample(value: number) { if (value > 0) { return <div>{value}</div>; } return <div>0</div>; }\n",
    "VueReader": "<script>function readerSample(value) { if (value > 0) { return 1; } return 0; }</script>\n",
    "PerlReader": "sub reader_sample { my ($value) = @_; if ($value > 0) { return 1; } return 0; }\n",
    "StReader": "FUNCTION reader_sample : INT\nVAR_INPUT value : INT; END_VAR\nIF value > 0 THEN reader_sample := 1; ELSE reader_sample := 0; END_IF;\nEND_FUNCTION\n",
    "RReader": "reader_sample <- function(value) { if (value > 0) { return(1) }; return(0) }\n",
    "PLSQLReader": "CREATE OR REPLACE PACKAGE BODY sample AS\nFUNCTION reader_sample(value IN NUMBER) RETURN NUMBER IS\nBEGIN\n IF value > 0 THEN RETURN 1; END IF;\n RETURN 0;\nEND reader_sample;\nEND sample;\n/\n",
}

# One deliberately incomplete input for every source-order reader.  These are
# not a syntax-validity corpus: each case targets a reader-local token or
# state-machine boundary while retaining the exact source suffix that selects
# that reader in Lizard's registry.
MALFORMED_TEMPLATES = {
    "CLikeReader": {
        "extension": "c",
        "kind": "unterminated-brace-nesting",
        "source": "int broken(int value) { if (value) { return value; \n",
    },
    "JavaReader": {
        "extension": "java",
        "kind": "unterminated-string-literal",
        "source": 'class Sample { String broken() { return "unterminated; } }\n',
    },
    "CSharpReader": {
        "extension": "cs",
        "kind": "unterminated-block-comment",
        "source": "class Sample { int Broken(int value) { /* comment\n",
    },
    "JavaScriptReader": {
        "extension": "js",
        "kind": "unterminated-template-literal",
        "source": "function broken(value) { return `unterminated ${value}\n",
    },
    "PythonReader": {
        "extension": "py",
        "kind": "unterminated-declaration-bracket",
        "source": "def broken(value:\n    return value\n",
    },
    "ObjCReader": {
        "extension": "m",
        "kind": "unterminated-block-comment",
        "source": "- (int)broken:(int)value { /* comment\n",
    },
    "TTCNReader": {
        "extension": "ttcn",
        "kind": "unterminated-function-nesting",
        "source": "function broken(in integer value) return integer { if (value > 0) {\n",
    },
    "RubyReader": {
        "extension": "rb",
        "kind": "unterminated-string-literal",
        "source": 'def broken(value)\n  value = "unterminated\n',
    },
    "PHPReader": {
        "extension": "php",
        "kind": "unterminated-block-comment",
        "source": "<?php\nfunction broken($value) { /* open\n",
    },
    "SwiftReader": {
        "extension": "swift",
        "kind": "unterminated-string-literal",
        "source": 'func broken(_ value: Int) -> Int { return "unterminated\n',
    },
    "ScalaReader": {
        "extension": "scala",
        "kind": "unterminated-block-comment",
        "source": "def broken(value: Int): Int = { /* incomplete\n",
    },
    "GDScriptReader": {
        "extension": "gd",
        "kind": "unterminated-triple-string",
        "source": 'func broken(value):\n    """open\n',
    },
    "GoReader": {
        "extension": "go",
        "kind": "unterminated-block-comment",
        "source": "package sample\nfunc broken(value int) int { /* open\n",
    },
    "LuaReader": {
        "extension": "lua",
        "kind": "unterminated-long-comment",
        "source": "function broken(value)\n  --[[ open\n",
    },
    "RustReader": {
        "extension": "rs",
        "kind": "unterminated-block-comment",
        "source": "fn broken(value: i32) -> i32 { /* open\n",
    },
    "TypeScriptReader": {
        "extension": "ts",
        "kind": "unterminated-expression-bracket",
        "source": "function broken(value: number): number { return (\n",
    },
    "FortranReader": {
        "extension": "f90",
        "kind": "missing-end-if-and-function",
        "source": "function broken(value) result(answer)\n integer :: value, answer\n if (value .gt. 0) then\n answer = 1\n",
    },
    "KotlinReader": {
        "extension": "kt",
        "kind": "unterminated-string-literal",
        "source": 'fun broken(value: Int): Int { return "unterminated\n',
    },
    "SolidityReader": {
        "extension": "sol",
        "kind": "unterminated-block-comment",
        "source": "contract Sample { function broken(uint value) public returns (uint) { /*\n",
    },
    "ErlangReader": {
        "extension": "erl",
        "kind": "unterminated-case-expression",
        "source": "broken(Value) -> case Value of 0 -> 0;\n",
    },
    "ZigReader": {
        "extension": "zig",
        "kind": "unterminated-string-literal",
        "source": 'fn broken(value: i32) i32 { return "unterminated\n',
    },
    "TSXReader": {
        "extension": "tsx",
        "kind": "unterminated-jsx-expression",
        "source": "function Broken(value: number) { return <div>{value}\n",
    },
    "VueReader": {
        "extension": "vue",
        "kind": "unterminated-script-string",
        "source": '<script>function broken(value) { return "unterminated\n',
    },
    "PerlReader": {
        "extension": "pl",
        "kind": "unterminated-block-nesting",
        "source": "sub broken { my ($value) = @_; if ($value) {\n",
    },
    "StReader": {
        "extension": "st",
        "kind": "missing-end-if-and-function",
        "source": "FUNCTION broken : INT\nVAR_INPUT value : INT; END_VAR\nIF value > 0 THEN\n",
    },
    "RReader": {
        "extension": "r",
        "kind": "unterminated-brace-nesting",
        "source": "broken <- function(value) { if (value) {\n",
    },
    "PLSQLReader": {
        "extension": "sql",
        "kind": "missing-end-if-and-function",
        "source": "CREATE OR REPLACE PACKAGE BODY sample AS\nFUNCTION broken(value IN NUMBER) RETURN NUMBER IS\nBEGIN\n IF value > 0 THEN\n",
    },
}


def reader_id(reader: type) -> str:
    return reader.__name__.removesuffix("Reader").replace("PLSQL", "plsql").replace("CLike", "c-like").lower()


def reader_source_path(reader: type) -> pathlib.Path:
    source = inspect.getsourcefile(reader)
    if source is None:
        raise RuntimeError(f"no source file for {reader.__name__}")
    candidate = SOURCE_ROOT / "lizard_languages" / pathlib.Path(source).name
    if not candidate.is_file():
        raise RuntimeError(f"source checkout is missing {candidate}")
    return candidate

def assert_source_checkout() -> None:
    revision = subprocess.check_output(["git", "-C", str(SOURCE_ROOT), "rev-parse", "HEAD"], text=True).strip()
    if revision != LIZARD_REVISION:
        raise RuntimeError(f"expected Lizard {LIZARD_REVISION}, got {revision}")
    if subprocess.check_output(["git", "-C", str(SOURCE_ROOT), "status", "--porcelain"], text=True):
        raise RuntimeError("Lizard source checkout must be clean")


def oracle_environment() -> dict[str, str]:
    """Run the installed entry point against the pinned source checkout."""
    environment = os.environ.copy()
    existing_python_path = environment.get("PYTHONPATH")
    source_path = str(SOURCE_ROOT)
    environment["PYTHONPATH"] = (
        source_path
        if not existing_python_path
        else f"{source_path}{os.pathsep}{existing_python_path}"
    )
    return environment


def write_json(path: pathlib.Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def parse_csv(text: str, fixture: pathlib.Path) -> list[dict[str, object]]:
    rows = list(csv.reader(text.splitlines()))
    if rows and rows[0][:2] == ["NLOC", "CCN"]:
        rows = rows[1:]
    measurements = []
    for row in rows:
        if not row:
            continue
        measurements.append({
            "file": fixture.relative_to(ROOT).as_posix(),
            "functionName": row[7],
            "nloc": int(row[0]),
            "ccn": int(row[1]) if row[1] else None,
            "parameterCount": int(row[3]),
            "startLine": int(row[9]),
            "endLine": int(row[10]),
        })
    return measurements


def parse_full_csv(text: str, fixture: pathlib.Path) -> list[dict[str, object]]:
    rows = list(csv.reader(text.splitlines()))
    if rows and rows[0][:2] == ["NLOC", "CCN"]:
        rows = rows[1:]
    measurements = []
    for row in rows:
        if not row:
            continue
        measurements.append({
            "ccn": int(row[1]) if row[1] else None,
            "endLine": int(row[10]),
            "file": fixture.relative_to(ROOT).as_posix(),
            "functionName": row[7],
            "length": int(row[4]),
            "longName": row[8],
            "nloc": int(row[0]),
            "parameterCount": int(row[3]),
            "startLine": int(row[9]),
            "tokenCount": int(row[2]),
        })
    return measurements


def invoke_oracle(fixtures: Iterable[pathlib.Path]) -> list[dict[str, object]]:
    observations = []
    for fixture in fixtures:
        command = ["lizard", fixture.relative_to(ROOT).as_posix(), "--csv"]
        result = subprocess.run(
            command,
            cwd=ROOT,
            check=False,
            capture_output=True,
            env=oracle_environment(),
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"oracle failed for {fixture}: {result.stderr or result.stdout}")
        observations.append({
            "fixture": fixture.relative_to(ROOT).as_posix(),
            "measurements": parse_csv(result.stdout, fixture),
            "oracleCommand": command,
        })
    return observations


def invoke_malformed_oracle(
    fixtures: Iterable[tuple[type, pathlib.Path, dict[str, str]]],
) -> list[dict[str, object]]:
    observations = []
    for reader, fixture, source_case in fixtures:
        command = ["lizard", fixture.relative_to(ROOT).as_posix(), "--csv"]
        result = subprocess.run(
            command,
            cwd=ROOT,
            check=False,
            capture_output=True,
            env=oracle_environment(),
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(
                "malformed oracle must select a stable successful Lizard observation "
                f"for {fixture}: {result.stderr or result.stdout}"
            )
        observations.append({
            "canonicalExtension": source_case["extension"],
            "fixture": fixture.relative_to(ROOT).as_posix(),
            "kind": source_case["kind"],
            "measurements": parse_full_csv(result.stdout, fixture),
            "oracleCommand": command,
            "readerClass": reader.__name__,
            "readerId": reader_id(reader),
            "sourceSha256": hashlib.sha256(fixture.read_bytes()).hexdigest(),
        })
    return observations


def main() -> None:
    assert_source_checkout()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    FIXTURES.mkdir(parents=True, exist_ok=True)
    readers = list(lizard_languages.languages())
    mapping_readers = []
    malformed_fixtures = []
    normal_fixtures = []
    edge_fixtures = []
    for reader in readers:
        name = reader.__name__
        template = TEMPLATES[name]
        reader_dir = FIXTURES / reader_id(reader)
        reader_dir.mkdir(parents=True, exist_ok=True)
        upstream_extensions = list(reader.ext)
        extensions = list(dict.fromkeys(extension.lower() for extension in upstream_extensions))
        source_path = reader_source_path(reader)
        malformed_case = MALFORMED_TEMPLATES.get(name)
        if malformed_case is None:
            raise RuntimeError(f"missing malformed source case for {name}")
        target = (
            "src/package-checks/function-metrics/analyzer/shared/clike.ts"
            if name == "CLikeReader"
            else f"src/package-checks/function-metrics/analyzer/readers/{reader_id(reader)}.ts"
        )
        mapping_readers.append({
            "extensions": extensions,
            "upstreamExtensionSpellings": upstream_extensions,
            "readerClass": name,
            "readerId": reader_id(reader),
            "targetOwner": target,
            "upstreamPath": f"lizard_languages/{source_path.name}",
        })
        for extension in extensions:
            fixture = reader_dir / f"normal.{extension}"
            fixture.write_text(template, encoding="utf-8")
            normal_fixtures.append(fixture)
        edge = reader_dir / f"edge.{extensions[0]}"
        edge.write_text(template + "\n\n", encoding="utf-8")
        edge_fixtures.append(edge)
        malformed_fixture = reader_dir / f"malformed.{malformed_case['extension']}"
        malformed_fixture.write_text(malformed_case["source"], encoding="utf-8")
        malformed_fixtures.append((reader, malformed_fixture, malformed_case))

    mapping = {
        "extensionCount": sum(len(reader["extensions"]) for reader in mapping_readers),
        "oracle": {"revision": LIZARD_REVISION, "tag": LIZARD_TAG, "versionCommand": ["lizard", "--version"]},
        "readerCount": len(mapping_readers),
        "readers": mapping_readers,
        "schemaVersion": 1,
    }
    write_json(EVIDENCE / "lizard-1.23-reader-extension-mapping.json", mapping)
    observations = {
        "fixtures": invoke_oracle([*normal_fixtures, *edge_fixtures]),
        "oracle": {"command": ["lizard", "--version"], "output": subprocess.check_output(["lizard", "--version"], env=oracle_environment(), text=True).strip(), "revision": LIZARD_REVISION, "tag": LIZARD_TAG},
        "schemaVersion": 1,
    }
    write_json(EVIDENCE / "lizard-1.23-oracle-observations.json", observations)
    malformed_observations = {
        "extensionCount": sum(len(reader["extensions"]) for reader in mapping_readers),
        "fixtures": invoke_malformed_oracle(malformed_fixtures),
        "oracle": {
            "command": ["lizard", "--version"],
            "output": subprocess.check_output(
                ["lizard", "--version"], env=oracle_environment(), text=True
            ).strip(),
            "revision": LIZARD_REVISION,
            "tag": LIZARD_TAG,
        },
        "readerCount": len(mapping_readers),
        "schemaVersion": 1,
    }
    write_json(EVIDENCE / "lizard-1.23-malformed-reader-observations.json", malformed_observations)


if __name__ == "__main__":
    main()
