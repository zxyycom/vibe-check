import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProjectChangeFlagRegion, ProjectChangesConfiguration } from "../index.ts";
import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";

describe("Project Definition changes", () => {
  it("snapshots complete pattern regions with stable frozen identity", () => {
    const patterns = ["src/**"];
    const authored: ProjectChangesConfiguration = {
      flags: { source: { patterns } },
      source: { compareWith: "HEAD" }
    };
    const definition = defineConfig({ changes: authored });
    const explicit = defineConfig({
      changes: {
        flags: { source: { patterns: ["src/**"] } },
        source: { compareWith: "HEAD" }
      }
    });
    const validated = validateProjectDefinition(definition);
    assert.equal(validated.ok, true);
    if (!validated.ok) return;
    const normalized = normalizeProjectDefinition(validated.value);
    const expected = {
      flags: { source: { patterns: ["src/**"] } },
      source: { compareWith: "HEAD" }
    };
    assert.deepEqual(normalized.changes, expected);
    assert.deepEqual(normalized.declarative.changes, expected);
    assert.deepEqual(normalizeProjectDefinition(definition).changes, expected);
    assert.equal(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(explicit).declarative)
    );
    assert.notEqual(normalized.changes, authored);
    assert.equal(Object.hasOwn(authored.flags.source ?? {}, "exclude"), false);
    assert.equal(Object.isFrozen(normalized.changes), true);
    assert.equal(Object.isFrozen(normalized.changes?.source), true);
    assert.equal(Object.isFrozen(normalized.changes?.flags), true);
    assert.equal(Object.isFrozen(normalized.changes?.flags.source), true);
    assert.equal(Object.isFrozen(normalized.changes?.flags.source?.patterns), true);
    patterns.push("docs/**");
    assert.deepEqual(normalized.changes, expected);

    type AcceptsOwnUndefined = {
      patterns: undefined;
    } extends ProjectChangeFlagRegion
      ? true
      : false;
    const acceptsOwnUndefined: AcceptsOwnUndefined = false;
    assert.equal(acceptsOwnUndefined, false);
  });

  it("rejects malformed regions without relaxing required fields or closed input safety", () => {
    let accessorCalls = 0;
    const accessorRegion = Object.defineProperty({ patterns: ["src/**"] }, "exclude", {
      enumerable: true,
      get: () => {
        accessorCalls += 1;
        return [];
      }
    });
    const accessorArray = Object.defineProperty([], "0", {
      enumerable: true,
      get: () => {
        accessorCalls += 1;
        return "src/**";
      }
    });
    const malformedRegions: readonly unknown[] = [
      {},
      { exclude: [] },
      { patterns: undefined },
      { patterns: null },
      { patterns: "src/**" },
      { patterns: [""] },
      { patterns: [false] },
      { patterns: new Array(1) },
      { patterns: Object.assign([], { extra: true }) },
      { patterns: accessorArray },
      { patterns: ["src/**"], exclude: [] },
      { patterns: ["src/**"], include: [] },
      { patterns: ["src/**"], extra: [] },
      { patterns: ["src/**"], [Symbol("extra")]: [] },
      Object.defineProperty({ patterns: ["src/**"] }, "exclude", { value: [] }),
      Object.create({ exclude: [] }, { patterns: { enumerable: true, value: ["src/**"] } }),
      accessorRegion
    ];
    const malformedChanges: readonly unknown[] = [
      ...malformedRegions.map((region) => ({
        flags: { source: region },
        source: { compareWith: "HEAD" }
      })),
      { flags: { source: { patterns: ["src/**"] } } },
      { flags: { source: { patterns: ["src/**"] } }, source: undefined },
      { flags: { source: { patterns: ["src/**"] } }, source: {} },
      { flags: { source: { patterns: ["src/**"] } }, source: { compareWith: undefined } },
      { flags: { source: { patterns: ["src/**"] } }, source: { compareWith: "HEAD", extra: true } },
      { flags: {}, source: { compareWith: "HEAD" } }
    ];
    const defaults = defineConfig({});
    for (const changes of malformedChanges) {
      assert.deepEqual(validateProjectDefinition({ ...defaults, changes }), {
        error: {
          kind: "invalid-project-definition",
          path: "definition.changes",
          reason: "invalid-value"
        },
        ok: false
      });
    }
    assert.equal(accessorCalls, 0);
  });
});
