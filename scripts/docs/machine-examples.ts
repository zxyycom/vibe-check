#!/usr/bin/env bun

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  serializeMachinePublicationV2,
  validateMachinePublicationSetV2
} from "../../src/product/quality-core/output/publication-v2/index.ts";
import { canonicalMachineExamples } from "./machine-example-fixtures.ts";
import {
  MACHINE_EXAMPLES_ROOT,
  type GeneratedMachineExampleFile
} from "./machine-example-model.ts";
import {
  checkPublishedMachineExampleFiles,
  publishMachineExampleFiles
} from "./machine-example-publication.ts";
import { renderMachineExampleReadme } from "./machine-example-readme.ts";

const encoder = new TextEncoder();

export function generatePublishedMachineExamples(): void {
  publishMachineExampleFiles(generatedFiles());
}

export function checkPublishedMachineExamples(): void {
  checkPublishedMachineExampleFiles(generatedFiles());
}

function generatedFiles(): GeneratedMachineExampleFile[] {
  return canonicalMachineExamples().flatMap((example) => {
    const candidates = serializeMachinePublicationV2(example.publication);
    const validation = validateMachinePublicationSetV2({
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
  return process.argv[1]
    ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const args = process.argv.slice(2);
  try {
    if (args.length === 0) {
      generatePublishedMachineExamples();
      console.log("generated machine examples: 5 artifact set(s)");
    } else if (args.length === 1 && args[0] === "--check") {
      checkPublishedMachineExamples();
      console.log("machine example generation current: 5 artifact set(s)");
    } else {
      throw new Error("usage: machine-examples.ts [--check]");
    }
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
