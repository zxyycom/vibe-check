import { createHash } from "node:crypto";

import type {
  CurrentCompositionExactInputs
} from "./check-record/current-composition.ts";
import type { NamedReferenceIdentity } from "./check-record/policy-model.ts";
import type {
  CodeAreaFileMap,
  CodeAreaFingerprint,
  ResolvedQualityConfig
} from "./model/schema.ts";
import { selectJscpdTargetFileMap } from "./measurement/current-revision/jscpd.ts";
import { selectLizardTargetFiles } from "./measurement/metrics.ts";

export function exactCompositionInputs(input: Readonly<{
  cacheRootDir: string;
  commitSha: string;
  config: ResolvedQualityConfig;
  fileMap: CodeAreaFileMap;
  fingerprints: Readonly<Record<string, CodeAreaFingerprint>>;
  rootDir: string;
  scanFiles: readonly string[];
}>): CurrentCompositionExactInputs {
  const duplicateFileMap = selectJscpdTargetFileMap(input.fileMap, input.config);
  return Object.freeze({
    duplicateDetection: Object.freeze({
      areas: Object.freeze(Array.from(duplicateFileMap, ([codeArea, files]) =>
        Object.freeze({
          approvedExactPaths: Object.freeze([...files]),
          codeArea,
          inputFingerprint: Object.freeze(input.fingerprints[codeArea] ?? {
            fileCount: 0,
            fileList: [],
            fingerprint: "empty"
          })
        })
      )),
      cacheRootDir: input.cacheRootDir,
      commitSha: input.commitSha,
      rootDir: input.rootDir
    }),
    fileMetrics: Object.freeze({
      approvedExactPaths: Object.freeze([...input.scanFiles]),
      rootDir: input.rootDir
    }),
    functionMetrics: Object.freeze({
      approvedExactPaths: Object.freeze(
        selectLizardTargetFiles([...input.scanFiles], input.config)
      ),
      rootDir: input.rootDir
    })
  });
}

export function emptyCompositionExactInputs(input: Readonly<{
  cacheRootDir: string;
  commitSha: string;
  rootDir: string;
}>): CurrentCompositionExactInputs {
  return Object.freeze({
    duplicateDetection: Object.freeze({
      areas: Object.freeze([]),
      cacheRootDir: input.cacheRootDir,
      commitSha: input.commitSha,
      rootDir: input.rootDir
    }),
    fileMetrics: Object.freeze({ approvedExactPaths: Object.freeze([]), rootDir: input.rootDir }),
    functionMetrics: Object.freeze({
      approvedExactPaths: Object.freeze([]),
      rootDir: input.rootDir
    })
  });
}

export function baselineReferenceIdentity(commitSha: string): NamedReferenceIdentity {
  const digest = createHash("sha256").update(commitSha).digest("hex");
  return Object.freeze({
    referenceId: `reference/v1/sha256:${digest}`,
    referenceName: "baseline"
  });
}
