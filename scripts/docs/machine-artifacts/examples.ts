#!/usr/bin/env bun

import path from "node:path";
import { fileURLToPath } from "node:url";

import { serializeMachinePublicationV4 } from "../../../src/output/machine-v4/serializers.ts";
import { validateMachinePublicationSetV4 } from "../../../src/output/machine-v4/validation.ts";
import { canonicalMachineExamples } from "./fixtures.ts";
import {
  MACHINE_EXAMPLES_ROOT,
  MACHINE_EXAMPLE_OUTCOMES,
  type GeneratedMachineExampleFile
} from "./example-contract.ts";
import {
  checkPublishedMachineExampleFiles,
  publishMachineExampleFiles
} from "./example-publication.ts";
import { renderMachineExampleReadme } from "./readme-examples.ts";

const encoder = new TextEncoder();

export function generatePublishedMachineExamples(): void {
  publishMachineExampleFiles(generatedFiles());
}

export function checkPublishedMachineExamples(): void {
  checkPublishedMachineExampleFiles(generatedFiles());
}

function generatedFiles(): readonly GeneratedMachineExampleFile[] {
  return canonicalMachineExamples().flatMap((example) => {
    const candidates = serializeMachinePublicationV4(example.publication);
    const validation = validateMachinePublicationSetV4({
      runJson: encoder.encode(candidates.runJson),
      recordsNdjson: encoder.encode(candidates.recordsNdjson)
    });
    if (!validation.ok) {
      throw new Error(
        `generated ${example.outcome} example is invalid: ${validation.diagnostic.logicalArtifact}: ${validation.diagnostic.message}`
      );
    }
    const outcomeRoot = `${MACHINE_EXAMPLES_ROOT}/${example.outcome}`;
    return [
      { contents: candidates.runJson, relativePath: `${outcomeRoot}/run.json` },
      {
        contents: candidates.recordsNdjson,
        relativePath: `${outcomeRoot}/records.ndjson`
      },
      {
        contents: renderMachineExampleReadme(example),
        relativePath: `${outcomeRoot}/README.md`
      }
    ];
  });
}

function isMainModule(): boolean {
  return process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

if (isMainModule()) {
  const args = process.argv.slice(2);
  try {
    if (args.length === 0) {
      generatePublishedMachineExamples();
      console.log(`generated machine examples: ${MACHINE_EXAMPLE_OUTCOMES.length} artifact set(s)`);
    } else if (args.length === 1 && args[0] === "--check") {
      checkPublishedMachineExamples();
      console.log(
        `machine example generation current: ${MACHINE_EXAMPLE_OUTCOMES.length} artifact set(s)`
      );
    } else {
      throw new Error("usage: machine-artifacts/examples.ts [--check]");
    }
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
