import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ProcessInvocation } from "../../development/command.ts";
import { workspaceFormatInvocation } from "../../development/format.ts";
import { lintInvocation } from "../../development/lint.ts";
import { typecheckInvocation } from "../../development/typecheck.ts";
import type { ProjectGateProfile, ProjectGateTag } from "../../project-gate/catalog.ts";
import type { ProjectGateSelection } from "../../project-gate/controls.ts";
import { defineConfig, type Check, type ProjectDefinition } from "vibe-check";

import { defineProjectGateEntries, type ProjectGateEntry } from "./entries.ts";
import { projectGateCheckForSelection } from "./eligibility.ts";
import {
  createDecisionRecordsCheck,
  createDocsValidationCheck,
  createTestEvidenceCheck
} from "./native-check.ts";
import { createProcessCheck } from "./process-check.ts";
import { createTestEvidenceRuleTestsCheck } from "./test-evidence-rule-tests-check.ts";

const requiredAndFull = ["required", "full"] as const;
const scanEntryPath = fileURLToPath(new URL("../scan.ts", import.meta.url));
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export interface ProjectGateRuntime {
  readonly invocationLogDirectory: string;
}

/** Creates this invocation's project-private ordinary Check entries. */
export function createProjectGateEntries(runtime: ProjectGateRuntime): readonly ProjectGateEntry[] {
  return defineProjectGateEntries([
    processEntry({
      invocation: typecheckInvocation("product"),
      checkId: "typecheck-product",
      displayName: "TypeScript product typecheck and import boundary",
      profiles: requiredAndFull,
      tags: ["product"],
      runtime
    }),
    processEntry({
      invocation: lintInvocation("product"),
      checkId: "lint-product",
      displayName: "TypeScript product lint",
      profiles: requiredAndFull,
      tags: ["product"],
      runtime
    }),
    processEntry({
      invocation: typecheckInvocation("scripts"),
      checkId: "typecheck-scripts",
      displayName: "TypeScript script typecheck",
      profiles: requiredAndFull,
      tags: ["scripts"],
      runtime
    }),
    processEntry({
      invocation: lintInvocation("scripts"),
      checkId: "lint-scripts",
      displayName: "TypeScript script lint",
      profiles: requiredAndFull,
      tags: ["scripts"],
      runtime
    }),
    processEntry({
      invocation: workspaceFormatInvocation("check"),
      checkId: "format-check",
      displayName: "Source format",
      profiles: requiredAndFull,
      tags: ["format"],
      runtime
    }),
    processEntry({
      invocation: {
        args: ["exec", "--", "bun", scanEntryPath],
        command: "mise",
        cwd: repositoryRoot
      },
      checkId: "repository-quality",
      displayName: "Repository Package Run dogfood",
      profiles: requiredAndFull,
      tags: ["quality"],
      runtime
    }),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-json-validator",
        displayName: "Docs JSON validator",
        task: "json"
      }),
      ["docs"]
    ),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-schema-validator",
        displayName: "Docs schema validator",
        task: "schema"
      }),
      ["docs"]
    ),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-example-validator",
        displayName: "Docs example validator",
        task: "examples"
      }),
      ["docs"]
    ),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-links-validator",
        displayName: "Docs links validator",
        task: "links"
      }),
      ["docs"]
    ),
    commonEntry(createDecisionRecordsCheck(), ["catalog"]),
    commonEntry(createTestEvidenceCheck(), ["catalog", "tests"]),
    commonEntry(createTestEvidenceRuleTestsCheck(runtime.invocationLogDirectory), [
      "catalog",
      "tests"
    ]),
    processEntry({
      invocation: { args: ["diff", "--check"], command: "git", cwd: repositoryRoot },
      checkId: "git-diff-whitespace",
      displayName: "Git diff whitespace",
      profiles: requiredAndFull,
      tags: ["git"],
      runtime
    })
  ]);
}

/** Projects entry eligibility into one ordinary Project Definition. */
export function createProjectGateDefinition(
  entries: readonly ProjectGateEntry[],
  selection: ProjectGateSelection
): ProjectDefinition {
  return defineConfig({
    checks: entries.map((entry) => projectGateCheckForSelection(entry, selection)),
    effects: {
      cache: { enabled: false },
      output: { enabled: false },
      progress: { enabled: true }
    },
    scheduler: { maxParallel: 4 }
  });
}

function processEntry(
  input: Readonly<{
    readonly invocation: ProcessInvocation;
    readonly checkId: string;
    readonly displayName: string;
    readonly profiles: readonly ProjectGateProfile[];
    readonly tags: readonly ProjectGateTag[];
    readonly runtime: ProjectGateRuntime;
  }>
): ProjectGateEntry {
  const { checkId, displayName, invocation, profiles, runtime, tags } = input;
  return Object.freeze({
    check: createProcessCheck(
      {
        args: invocation.args,
        checkId,
        command: invocation.command,
        cwd: invocation.cwd,
        displayName,
        ...(invocation.env === undefined ? {} : { environment: definedEnvironment(invocation.env) })
      },
      runtime.invocationLogDirectory
    ),
    profiles,
    tags
  });
}

/** Assigns the selection metadata shared by every required and full Check. */
function commonEntry(check: Check, tags: readonly ProjectGateTag[]): ProjectGateEntry {
  return Object.freeze({ check, profiles: requiredAndFull, tags });
}

function definedEnvironment(environment: NodeJS.ProcessEnv): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(environment)) {
    if (value !== undefined) values[name] = value;
  }
  return Object.freeze(values);
}
