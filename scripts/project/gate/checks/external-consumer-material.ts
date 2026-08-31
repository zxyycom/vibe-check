import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV
} from "../../../package/candidate/acceptance-input.ts";
import {
  EXTERNAL_CONSUMER_ROOT_ENV,
  parseExternalConsumerMaterialData,
  type ExternalConsumerMaterialData,
  validateExternalConsumerMaterialPhysical
} from "../../../package/candidate/external-consumer/input.ts";
import {
  createProcessCheckWithDataDependencyAndSuccessData,
  type ProcessCheckDataDependency
} from "./process/process.ts";
import {
  parseProjectGatePreparedCandidateData,
  type ProjectGatePreparedCandidateData
} from "./prepared-candidate.ts";

const providerAdapterPath = fileURLToPath(
  new URL("../../../package/candidate/external-consumer/provider.ts", import.meta.url)
);
const repositoryRoot = resolve(fileURLToPath(new URL("../../../..", import.meta.url)));

/** Owns the one temporary root for a bound Gate Run, including cancelled child setup. */
export interface ExternalConsumerMaterialLease {
  cleanup(): void;
  providerRoot(): string;
}

/** Creates a lazily allocated root which the bound Gate Run always removes in `finally`. */
export function createExternalConsumerMaterialLease(): ExternalConsumerMaterialLease {
  let root: string | undefined;
  return Object.freeze({
    cleanup(): void {
      if (root === undefined) return;
      const owned = root;
      root = undefined;
      rmSync(owned, { force: true, recursive: true });
    },
    providerRoot(): string {
      if (root === undefined) root = mkdtempSync(join(tmpdir(), "vibe-check-external-consumer-"));
      return root;
    }
  });
}

/** Runs the cancellable external installation adapter and publishes its closed typed result. */
export function createExternalConsumerMaterialCheck(
  input: Readonly<{
    readonly invocationLogDirectory: string;
    readonly lease: ExternalConsumerMaterialLease;
    readonly preparedCandidateCheckId: string;
    readonly timeoutMs: number;
  }>
) {
  return createProcessCheckWithDataDependencyAndSuccessData(
    {
      args: [providerAdapterPath],
      checkId: "prepared-external-package-consumer",
      command: process.execPath,
      cwd: repositoryRoot,
      displayName: "Prepared external package consumer",
      timeoutMs: input.timeoutMs
    },
    input.invocationLogDirectory,
    providerDependency(input.preparedCandidateCheckId, input.lease),
    {
      fromStdout(stdout): unknown {
        return JSON.parse(stdout);
      },
      parseData: parseExternalConsumerMaterialData,
      validateDependencyData: (data, candidate) => {
        validateExternalConsumerMaterialPhysical(data);
        return validateExternalConsumerProviderProvenance(
          data,
          candidate,
          input.lease.providerRoot()
        );
      }
    }
  );
}

/** Binds child stdout to this exact prepared artifact and this invocation's owned root. */
export function validateExternalConsumerProviderProvenance(
  data: ExternalConsumerMaterialData,
  candidate: ProjectGatePreparedCandidateData,
  providerRoot: string
): ExternalConsumerMaterialData {
  if (
    data.artifactPath !== candidate.artifactPath ||
    data.sha256 !== candidate.sha256 ||
    data.consumerDirectory !== join(providerRoot, "consumer")
  ) {
    throw new TypeError("external consumer provider output does not match its owned provenance");
  }
  return data;
}

function providerDependency(
  checkId: string,
  lease: ExternalConsumerMaterialLease
): ProcessCheckDataDependency<ProjectGatePreparedCandidateData> {
  return Object.freeze({
    checkId,
    environment(candidate: ProjectGatePreparedCandidateData): Readonly<Record<string, string>> {
      return Object.freeze({
        [CANDIDATE_ARTIFACT_PATH_ENV]: candidate.artifactPath,
        [CANDIDATE_ARTIFACT_SHA256_ENV]: candidate.sha256,
        [EXTERNAL_CONSUMER_ROOT_ENV]: lease.providerRoot()
      });
    },
    parseData: parseProjectGatePreparedCandidateData
  });
}
