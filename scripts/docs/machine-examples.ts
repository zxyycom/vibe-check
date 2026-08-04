#!/usr/bin/env bun

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  projectMachineMetricsV1,
  serializeMachineArtifactCandidatesV1,
  validateMachineArtifactSetV1
} from "../../src/product/machine-output.ts";
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
    const metrics = projectMachineMetricsV1(example.metrics);
    const candidates = serializeMachineArtifactCandidatesV1(metrics);
    const bytes = {
      metricsJson: encoder.encode(candidates.metricsJson),
      warningsAllNdjson: encoder.encode(candidates.warningsAllNdjson),
      warningsNdjson: encoder.encode(candidates.warningsNdjson)
    };
    const validation = validateMachineArtifactSetV1(bytes);
    if (!validation.ok) {
      const diagnostic = validation.diagnostic;
      throw new Error(
        `generated ${example.outcome} example is invalid: ${diagnostic.logicalArtifact}: ${diagnostic.message}`
      );
    }
    assertZeroWarningStreams(example.outcome, metrics, bytes);

    const outcomeRoot = `${MACHINE_EXAMPLES_ROOT}/${example.outcome}`;
    return [
      {
        contents: candidates.metricsJson,
        relativePath: `${outcomeRoot}/metrics.json`
      },
      {
        contents: candidates.warningsNdjson,
        relativePath: `${outcomeRoot}/warnings.ndjson`
      },
      {
        contents: candidates.warningsAllNdjson,
        relativePath: `${outcomeRoot}/warnings-all.ndjson`
      },
      {
        contents: renderMachineExampleReadme(example),
        relativePath: `${outcomeRoot}/README.md`
      }
    ];
  });
}

function assertZeroWarningStreams(
  outcome: string,
  metrics: ReturnType<typeof projectMachineMetricsV1>,
  bytes: {
    readonly warningsAllNdjson: Uint8Array;
    readonly warningsNdjson: Uint8Array;
  }
): void {
  if (
    metrics.warnings.changed.length === 0 &&
    bytes.warningsNdjson.byteLength !== 0
  ) {
    throw new Error(`${outcome} warnings.ndjson must be zero bytes`);
  }
  if (
    metrics.warnings.all.length === 0 &&
    bytes.warningsAllNdjson.byteLength !== 0
  ) {
    throw new Error(`${outcome} warnings-all.ndjson must be zero bytes`);
  }
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
