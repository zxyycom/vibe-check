/**
 * Derived from terryyin/lizard 1.24.0 tests.
 * Sources: test/test_languages/testPHP.py and test/test_languages/testPLSQL.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: direct fixture and high-risk reader parity coverage.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode } from "../pipeline.ts";
import type { FunctionInfo } from "../analysis-model.ts";
import type { ReaderConstructor } from "../contracts.ts";
import { PHPReader } from "./php.ts";
import { PLSQLReader } from "./plsql.ts";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/lizard-1.24.0");

test("PHP and PL/SQL readers preserve every checked-in suffix and edge fixture", () => {
  for (const fixture of ["normal.php", "edge.php"]) {
    assert.deepEqual(readFixture("php", fixture, PHPReader), [
      measurement("readerSample", 2, 2, 1, 2, 1)
    ]);
  }
  for (const suffix of ["sql", "pks", "pkb", "pls", "plb", "pck"]) {
    assert.deepEqual(readFixture("plsql", `normal.${suffix}`, PLSQLReader), [
      measurement("reader_sample", 2, 6, 5, 2, 1)
    ]);
  }
  assert.deepEqual(readFixture("plsql", "edge.sql", PLSQLReader), [
    measurement("reader_sample", 2, 6, 5, 2, 1)
  ]);
});

test("PHP preserves code blocks, namespace/use skipping, traits, closures, arrow suppression, and conditions", () => {
  assert.deepEqual(
    [...PHPReader.generateTokens("<html><?phpa=1?></html>")],
    ['"<html>"', "a", "=", "1", '"</html>"']
  );

  assert.deepEqual(
    measurements(
      analyze(
        "modern.php",
        `<html><?php
namespace Example;
use function Vendor\\ignored;
class Box {
  public function method(int $value): int { if ($value && $value > 0) { return $value; } return 0; }
}
trait Carrier {
  protected function carry($value) { return $value; }
}
$assigned = function ($value, $next) { return $value; };
$arrow = fn($value) => $value;
?>tail`,
        PHPReader
      )
    ),
    [
      measurement("Box::method", 5, 5, 1, 3, 1),
      measurement("Carrier::carry", 8, 9, 2, 1, 1),
      measurement("Carrier::(anonymous)", 10, 10, 1, 1, 1)
    ]
  );

  for (const sourceCode of [
    "<?php function f() { return $x ?? ''; } ?>",
    "<?php function f() { $x ??= 5; } ?>",
    "<?php function f() { return $obj?->name; } ?>",
    "<?php function f() { return $a ?: 'n'; } ?>"
  ]) {
    const [functionInfo] = analyze("question-operator.php", sourceCode, PHPReader);
    assert.equal(functionInfo?.maxNestingDepth, 0);
    assert.equal(functionInfo?.cyclomaticComplexity, 1);
  }
  assert.deepEqual(
    [...PHPReader.generateTokens("<?php $x ??= $obj?->value ?? $fallback ?: 'default'; ?>")].filter(
      (token) => token.includes("?")
    ),
    ["??=", "?->", "??", "?:"]
  );
  assert.ok([...PHPReader.generateTokens("<?php $value ? 'yes' : 'no'; ?>")].includes("?"));
});

test("PL/SQL preserves package procedures/functions/nesting/exception/control flow/parameters and triggers", () => {
  assert.deepEqual(
    measurements(
      analyze(
        "package.sql",
        `CREATE OR REPLACE PACKAGE BODY sample AS
  PROCEDURE outer(p_one IN NUMBER, p_two OUT VARCHAR2) IS
    FUNCTION inner(p_value IN NUMBER) RETURN NUMBER IS
    BEGIN
      IF p_value > 0 AND p_value < 10 THEN
        RETURN p_value;
      ELSIF p_value = 0 THEN
        RETURN 0;
      END IF;
      RETURN -1;
    END inner;
  BEGIN
    FOR i IN 1..2 LOOP
      NULL;
    END LOOP;
    LOOP
      EXIT WHEN p_one = 0;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END outer;
END sample;
/`,
        PLSQLReader
      )
    ),
    [measurement("inner", 3, 11, 9, 4, 1), measurement("outer", 2, 22, 13, 4, 2)]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "trigger.sql",
        `CREATE OR REPLACE TRIGGER app.audit_trigger
BEFORE INSERT ON sample
FOR EACH ROW
BEGIN
  IF :NEW.value > 0 OR :OLD.value > 0 THEN
    NULL;
  END IF;
END audit_trigger;
/`,
        PLSQLReader
      )
    ),
    [measurement("audit_trigger", 1, 8, 8, 3, 0)]
  );
});

function readFixture<Reader extends ReaderConstructor>(
  directory: string,
  fixture: string,
  Reader: Reader
): readonly FunctionMeasurement[] {
  const path = resolve(fixtureRoot, directory, fixture);
  return measurements(analyze(path, readFileSync(path, "utf8"), Reader));
}

function analyze<Reader extends ReaderConstructor>(
  filename: string,
  sourceCode: string,
  Reader: Reader
): readonly FunctionInfo[] {
  return analyzeSourceCode(filename, sourceCode, Reader).functionList;
}

function measurements(functions: readonly FunctionInfo[]): readonly FunctionMeasurement[] {
  return functions.map((functionInfo) =>
    measurement(
      functionInfo.name,
      functionInfo.startLine,
      functionInfo.endLine,
      functionInfo.nloc,
      functionInfo.cyclomaticComplexity,
      functionInfo.parameterCount
    )
  );
}

function measurement(
  name: string,
  startLine: number,
  endLine: number,
  nloc: number,
  ccn: number,
  parameterCount: number
): FunctionMeasurement {
  return { ccn, endLine, name, nloc, parameterCount, startLine };
}

type FunctionMeasurement = Readonly<{
  readonly ccn: number;
  readonly endLine: number;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}>;
