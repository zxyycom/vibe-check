import type { DuplicateDetectionAreaInput } from "./check-record/builtins/duplicate-detection.ts";
import type { FileMetricsExactInputSet } from "./check-record/builtins/file-metrics.ts";
import type { FunctionMetricsExactInputSet } from "./check-record/builtins/function-metrics.ts";
import type { NamedReferenceIdentity } from "./check-record/policy-model.ts";
import type {
  CodeAreaFileMap,
  CodeAreaFingerprint,
  ResolvedQualityConfig
} from "./model/schema.ts";
import { selectJscpdTargetFileMap } from "./measurement/current-revision/jscpd.ts";
import { selectLizardTargetFiles } from "./measurement/metrics.ts";

type DuplicateAreaExactInput = Readonly<
  Omit<DuplicateDetectionAreaInput, "minimumTokens">
>;

export interface BuiltInExactInputs {
  readonly duplicateDetection: Readonly<{
    readonly areas: readonly DuplicateAreaExactInput[];
    readonly cacheRootDir: string;
    readonly commitSha: string;
    readonly rootDir: string;
  }>;
  readonly fileMetrics: FileMetricsExactInputSet;
  readonly functionMetrics: FunctionMetricsExactInputSet;
}

export interface BuiltInReferenceInputs extends BuiltInExactInputs {
  readonly identity: NamedReferenceIdentity;
}

export function prepareBuiltInExactInputs(input: Readonly<{
  cacheRootDir: string;
  commitSha: string;
  config: Pick<
    ResolvedQualityConfig,
    "checks" | "codeAreas" | "excludeDirs" | "generatedFiles"
  >;
  fileMap: CodeAreaFileMap;
  fingerprints: Readonly<Record<string, CodeAreaFingerprint>>;
  rootDir: string;
  scanFiles: readonly string[];
}>): BuiltInExactInputs {
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
