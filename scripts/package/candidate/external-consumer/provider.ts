#!/usr/bin/env bun

import { isAbsolute, join } from "node:path";

import { readGateCandidateAcceptanceArtifact } from "../acceptance-input.ts";
import { EXTERNAL_CONSUMER_MATERIAL_DATA_VERSION, EXTERNAL_CONSUMER_ROOT_ENV } from "./input.ts";
import { prepareExternalConsumerMaterial } from "./material.ts";

/** Performs the cancellable child setup owned by the Gate external-consumer provider Check. */
export function prepareExternalConsumerProviderOutput(
  environment: NodeJS.ProcessEnv = process.env
): string {
  const artifact = readGateCandidateAcceptanceArtifact(environment);
  const temporaryRoot = environment[EXTERNAL_CONSUMER_ROOT_ENV];
  if (artifact === undefined || temporaryRoot === undefined || !isAbsolute(temporaryRoot)) {
    throw new TypeError("external consumer provider input is incomplete or invalid");
  }
  const material = prepareExternalConsumerMaterial(artifact, {
    consumerDirectory: join(temporaryRoot, "consumer")
  });
  return JSON.stringify({
    artifactPath: material.artifactPath,
    consumerDirectory: material.consumerDirectory,
    installedPackageDirectory: material.installedPackageDirectory,
    resolvedEntryPath: material.resolvedEntryPath,
    schemaVersion: EXTERNAL_CONSUMER_MATERIAL_DATA_VERSION,
    sha256: material.sha256
  });
}

if (import.meta.main) process.stdout.write(prepareExternalConsumerProviderOutput());
