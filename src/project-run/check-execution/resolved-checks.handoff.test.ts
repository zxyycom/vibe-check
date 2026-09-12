import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckDependencies, CheckHandoffProvider } from "../../check/check.ts";
import { defineCheck } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import { PROJECT, definedHandoff, normalized } from "./resolved-checks.test-support.ts";

type HandoffProvider = CheckHandoffProvider<string, Map<string, Uint8Array>> &
  Readonly<{
    readonly displayName: string;
    readonly execution: NormalizedCheck["execution"];
  }>;

describe("Package Run direct Check execution", () => {
  it("delivers accepted provider handoffs only to direct dependents and clears them after each Run", async () => {
    const firstHandoff = new Map([["first", new Uint8Array([1])]]);
    const secondHandoff = new Map([["second", new Uint8Array([2])]]);
    const foreignProvider = defineCheck({
      checkId: "handoff-provider",
      displayName: "Foreign handoff provider",
      handoff: true,
      execution: () => ({ status: "passed", data: {}, handoff: new Map<string, Uint8Array>() })
    });
    const handoffs = [firstHandoff, secondHandoff];
    let providerCalls = 0;
    const provider = defineCheck({
      checkId: "handoff-provider",
      displayName: "Handoff provider",
      handoff: true,
      execution: () => {
        const handoff = handoffs[providerCalls];
        providerCalls += 1;
        if (handoff === undefined) throw new Error("missing test handoff");
        return { status: "passed" as const, data: { source: "canonical" }, handoff };
      }
    });
    let retainedDependencies: CheckDependencies | undefined;
    const firstRead = await executeHandoffRun(
      provider,
      foreignProvider,
      firstHandoff,
      (dependencies) => {
        retainedDependencies = dependencies;
      }
    );
    const secondRead = await executeHandoffRun(provider, foreignProvider, secondHandoff);

    assert.equal(firstRead, firstHandoff);
    assert.equal(secondRead, secondHandoff);
    assert.notEqual(firstRead, secondRead);
    assert.notEqual(retainedDependencies, undefined);
    if (retainedDependencies === undefined)
      throw new Error("dependent Check did not retain dependencies");
    assert.deepEqual(retainedDependencies.get(provider), {
      ok: false,
      error: { code: "upstream-handoff-unavailable", checkId: "handoff-provider" }
    });
  });

  async function executeHandoffRun(
    provider: HandoffProvider,
    foreignProvider: HandoffProvider,
    expectedHandoff: Map<string, Uint8Array>,
    observeDependencies?: (dependencies: CheckDependencies) => void
  ): Promise<Map<string, Uint8Array>> {
    let firstConsumerHandoff: Map<string, Uint8Array> | undefined;
    let secondConsumerHandoff: Map<string, Uint8Array> | undefined;
    let observedProviderRead: unknown;
    let foreignProviderRead: unknown;
    let lookalikeProviderRead: unknown;
    let transitiveProviderRead: unknown;
    const execution = await executeResolvedChecks({
      checks: [
        normalized(provider.execution, {
          checkId: provider.checkId,
          displayName: provider.displayName,
          handoff: definedHandoff(provider)
        }),
        normalized(
          ({ dependencies }) => {
            const read = dependencies.get(provider);
            assert.equal(read.ok, true);
            if (!read.ok) throw new Error("direct provider handoff was unavailable");
            assert.deepEqual(read.data, { source: "canonical" });
            firstConsumerHandoff = read.handoff;
            foreignProviderRead = dependencies.get(foreignProvider);
            lookalikeProviderRead = Reflect.apply(dependencies.get.bind(dependencies), undefined, [
              Object.freeze({ checkId: "handoff-provider", handoff: true })
            ]);
            observeDependencies?.(dependencies);
            return { status: "passed", data: { consumer: "first" } };
          },
          {
            checkId: "handoff-first-consumer",
            dependsOn: ["handoff-provider"],
            displayName: "First handoff consumer"
          }
        ),
        normalized(
          ({ dependencies }) => {
            const read = dependencies.get(provider);
            assert.equal(read.ok, true);
            if (!read.ok) throw new Error("direct provider handoff was unavailable");
            secondConsumerHandoff = read.handoff;
            return { status: "passed", data: { consumer: "second" } };
          },
          {
            checkId: "handoff-second-consumer",
            dependsOn: ["handoff-provider"],
            displayName: "Second handoff consumer"
          }
        ),
        normalized(
          ({ dependencies }) => {
            observedProviderRead = dependencies.get(provider);
            return { status: "passed", data: { consumer: "observer" } };
          },
          {
            checkId: "handoff-observer",
            observes: ["handoff-provider"],
            displayName: "Handoff observer"
          }
        ),
        normalized(() => ({ status: "passed", data: { middle: true } }), {
          checkId: "handoff-middle",
          dependsOn: ["handoff-provider"],
          displayName: "Handoff middle"
        }),
        normalized(
          ({ dependencies }) => {
            transitiveProviderRead = dependencies.get(provider);
            return { status: "passed", data: { consumer: "transitive" } };
          },
          {
            checkId: "handoff-transitive-consumer",
            dependsOn: ["handoff-middle"],
            displayName: "Transitive handoff consumer"
          }
        )
      ],
      maxParallel: 3,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(execution.kind, "completed");
    assert.equal(firstConsumerHandoff, expectedHandoff);
    assert.equal(secondConsumerHandoff, expectedHandoff);
    assert.deepEqual(observedProviderRead, {
      ok: false,
      error: { code: "dependency-not-declared", checkId: "handoff-provider" }
    });
    assert.deepEqual(transitiveProviderRead, {
      ok: false,
      error: { code: "dependency-not-declared", checkId: "handoff-provider" }
    });
    assert.deepEqual(foreignProviderRead, {
      ok: false,
      error: { code: "upstream-handoff-unavailable", checkId: "handoff-provider" }
    });
    assert.deepEqual(lookalikeProviderRead, {
      ok: false,
      error: { code: "dependency-not-declared", checkId: "handoff-provider" }
    });
    return expectedHandoff;
  }
});
