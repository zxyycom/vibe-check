import assert from "node:assert/strict";
import { it } from "node:test";

import { createProjectGateProcessEntry } from "./entry-factories.ts";

it("constructs exclusive process entry adapters and rejects mixed adapters", () => {
  const input = {
    checkId: "fixture-process",
    displayName: "Fixture process",
    invocation: { command: "fixture-command", args: [], cwd: "/fixture/workspace" },
    mutex: ["fixture-resource"],
    presets: ["test" as const],
    required: true
  };
  const dataDependency = {
    checkId: "fixture-provider",
    environment: (data: { readonly token: string }) => ({ FIXTURE_TOKEN: data.token }),
    parseData: () => ({ token: "fixture-token" })
  };
  const failureProjection = { recordsFromStdout: () => [] };
  const variants = [
    { entry: createProjectGateProcessEntry(input), dependencies: [] },
    {
      entry: createProjectGateProcessEntry({ ...input, dataDependency }),
      dependencies: ["fixture-provider"]
    },
    { entry: createProjectGateProcessEntry({ ...input, failureProjection }), dependencies: [] }
  ];

  for (const { entry, dependencies } of variants) {
    assert.equal(entry.check.checkId, input.checkId);
    assert.deepEqual(entry.check.dependsOn ?? [], dependencies);
    assert.deepEqual(entry.check.mutex, input.mutex);
    assert.deepEqual(entry.presets, input.presets);
    assert.equal(entry.required, true);
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.check.mutex));
    assert.ok(Object.isFrozen(entry.presets));
  }

  const mixedAdapters = { ...input, dataDependency, failureProjection };
  assert.throws(
    () => {
      // @ts-expect-error Both adapters are invalid even when passed through a variable.
      createProjectGateProcessEntry(mixedAdapters);
    },
    {
      name: "TypeError",
      message: "A process Check cannot combine dependency and structured failure adapters"
    }
  );
});
