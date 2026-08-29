#!/usr/bin/env bun

import path from "node:path";
import { fileURLToPath } from "node:url";

import { serializeMachinePublicationV4 } from "../../../../src/machine-output/v4/serializers.ts";
import { validateMachinePublicationSetV4 } from "../../../../src/machine-output/v4/validation.ts";
import { runAsyncMain } from "../../../process-execution/command.ts";
import { MACHINE_EXAMPLE_ROOT, type GeneratedMachineExampleFile } from "./contract.ts";
import { buildCanonicalMachineExample } from "./definition-execution.ts";
import { checkPublishedMachineExampleFiles, publishMachineExampleFiles } from "./publication.ts";

const encoder = new TextEncoder();

export async function generatePublishedMachineExamples(): Promise<void> {
  publishMachineExampleFiles(await generatedFiles());
}

export async function checkPublishedMachineExamples(): Promise<void> {
  checkPublishedMachineExampleFiles(await generatedFiles());
}

async function generatedFiles(): Promise<readonly GeneratedMachineExampleFile[]> {
  const example = await buildCanonicalMachineExample();
  const candidates = serializeMachinePublicationV4(example.publication);
  const validation = validateMachinePublicationSetV4({
    runJson: encoder.encode(candidates.runJson),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  });
  if (!validation.ok) {
    throw new Error(
      `generated mixed-outcomes example is invalid: ${validation.diagnostic.logicalArtifact}: ${validation.diagnostic.message}`
    );
  }
  return [
    { contents: candidates.runJson, relativePath: `${MACHINE_EXAMPLE_ROOT}/run.json` },
    {
      contents: candidates.recordsNdjson,
      relativePath: `${MACHINE_EXAMPLE_ROOT}/records.ndjson`
    }
  ];
}

function isMainModule(): boolean {
  return process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

if (isMainModule()) {
  await runAsyncMain(async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      await generatePublishedMachineExamples();
      console.log("generated machine examples: 1 artifact set");
    } else if (args.length === 1 && args[0] === "--check") {
      await checkPublishedMachineExamples();
      console.log("machine example generation current: 1 artifact set");
    } else {
      throw new Error("usage: machine-artifacts/examples/command.ts [--check]");
    }
  });
}
