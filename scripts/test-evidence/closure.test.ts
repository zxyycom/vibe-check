import assert from "node:assert/strict";
import test from "node:test";

import { closeStaticAndRuntimeEntities } from "./closure.ts";
import type { RuntimeTestEntity, StaticTestEntity } from "./entities.ts";

const identity = ["tests/example.test.ts", "7", "rejects invalid input"].join("\0");
const staticEntity: StaticTestEntity = {
  identity,
  sourcePath: "tests/example.test.ts",
  sourceRange: {
    startLine: 7,
    startColumn: 1,
    endLine: 7,
    endColumn: 42
  }
};
const runtimeEntity: RuntimeTestEntity = {
  identity,
  target: "tests/example.test.ts",
  selector: "contract > rejects invalid input"
};

test("closes one static and runtime entity into a stable Bun entity key", () => {
  const closed = closeBunEntities([staticEntity], [runtimeEntity]);

  assert.deepEqual(closed.diagnostics, []);
  assert.deepEqual(
    closed.entities.map(({ entityKey }) => entityKey),
    ["bun|tests/example.test.ts|contract > rejects invalid input"]
  );
});

test("reports static-only, runtime-only, and duplicate entity identities", () => {
  const staticOnly = closeBunEntities([staticEntity], []);
  assert.equal(staticOnly.diagnostics[0]?.code, "static-only");
  assert.equal(staticOnly.diagnostics[0]?.origin, "static");

  const runtimeOnly = closeBunEntities([], [runtimeEntity]);
  assert.equal(runtimeOnly.diagnostics[0]?.code, "runtime-only");
  assert.equal(runtimeOnly.diagnostics[0]?.origin, "runner");

  const duplicateStatic = closeBunEntities([staticEntity, { ...staticEntity }], [runtimeEntity]);
  assert.equal(duplicateStatic.diagnostics[0]?.code, "duplicate-entity");
  assert.equal(duplicateStatic.diagnostics[0]?.origin, "static");

  const duplicateRuntime = closeBunEntities([staticEntity], [runtimeEntity, { ...runtimeEntity }]);
  assert.equal(duplicateRuntime.diagnostics[0]?.code, "duplicate-entity");
  assert.equal(duplicateRuntime.diagnostics[0]?.origin, "runner");
});

function closeBunEntities(
  statics: StaticTestEntity[],
  runtime: RuntimeTestEntity[]
): ReturnType<typeof closeStaticAndRuntimeEntities> {
  return closeStaticAndRuntimeEntities({
    runner: "bun",
    statics,
    runtime,
    createEntityKey: ({ target, selector }) => `bun|${target}|${selector}`
  });
}
