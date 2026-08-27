import { resolveBunTestFiles } from "../../../test-evidence/discovery/bun-files.ts";
import { loadSupportedRunnerProfile } from "../../../test-evidence/profile.ts";

const PACKAGE_ARTIFACT_TEST_FILE = "scripts/package/artifact/artifact.test.ts";
const PACKAGE_CANDIDATE_TEST_FILE = "scripts/package/candidate/candidate.test.ts";
const PACKAGE_CONSUMER_TEST_FILE = "scripts/package/candidate/isolated-consumer.test.ts";

export const PROJECT_GATE_TEST_LANE_NAMES = [
  "packageArtifact",
  "packageCandidate",
  "packageConsumer",
  "packageSupporting",
  "productDuplicateDetection",
  "productFileMetrics",
  "productFunctionMetrics",
  "productJsonChecks",
  "productMarkdownLinks",
  "productRuntime",
  "productSupportingChecks",
  "scriptsProject",
  "scriptsTestEvidence",
  "scriptsTooling",
  "scriptsValidation"
] as const;

export type ProjectGateTestLaneName = (typeof PROJECT_GATE_TEST_LANE_NAMES)[number];
export type ProjectGateTestLanes = Readonly<Record<ProjectGateTestLaneName, readonly string[]>>;

type ProductPackageTestLaneName = Extract<
  ProjectGateTestLaneName,
  | "productDuplicateDetection"
  | "productFileMetrics"
  | "productFunctionMetrics"
  | "productJsonChecks"
  | "productMarkdownLinks"
  | "productSupportingChecks"
>;

const PRODUCT_PACKAGE_TEST_LANES = Object.freeze([
  Object.freeze({
    lane: "productDuplicateDetection",
    prefixes: Object.freeze(["src/package-checks/duplicate-detection/"])
  }),
  Object.freeze({
    lane: "productFileMetrics",
    prefixes: Object.freeze(["src/package-checks/file-metrics/"])
  }),
  Object.freeze({
    lane: "productFunctionMetrics",
    prefixes: Object.freeze(["src/package-checks/function-metrics/"])
  }),
  Object.freeze({
    lane: "productJsonChecks",
    prefixes: Object.freeze([
      "src/package-checks/json-document/",
      "src/package-checks/json-schema-validation/",
      "src/package-checks/json-validation/"
    ])
  }),
  Object.freeze({
    lane: "productMarkdownLinks",
    prefixes: Object.freeze(["src/package-checks/markdown-link-validation/"])
  }),
  Object.freeze({
    lane: "productSupportingChecks",
    prefixes: Object.freeze([
      "src/package-checks/host-environment/",
      "src/package-checks/maintenance-reminders/",
      "src/package-checks/project-files/"
    ])
  })
] as const satisfies readonly Readonly<{
  readonly lane: ProductPackageTestLaneName;
  readonly prefixes: readonly string[];
}>[]);

/** Partitions the complete Test Evidence surface into stable Gate execution subchecks. */
export function resolveProjectGateTestLanes(repositoryRoot: string): ProjectGateTestLanes {
  const profile = loadSupportedRunnerProfile();
  const allFiles = resolveBunTestFiles({ workspaceRoot: repositoryRoot, profile: profile.bun });
  const laneFiles = emptyTestLaneFiles();
  for (const file of allFiles) laneFiles[testLaneForFile(file)].push(file);

  const lanes = freezeTestLanes(laneFiles);
  assertCompletePartition(allFiles, lanes);
  return lanes;
}

function testLaneForFile(file: string): ProjectGateTestLaneName {
  if (file === PACKAGE_ARTIFACT_TEST_FILE) return "packageArtifact";
  if (file === PACKAGE_CANDIDATE_TEST_FILE) return "packageCandidate";
  if (file === PACKAGE_CONSUMER_TEST_FILE) return "packageConsumer";
  if (file.startsWith("scripts/package/")) return "packageSupporting";
  if (file.startsWith("src/package-checks/")) return productPackageTestLane(file);
  if (file.startsWith("src/")) return "productRuntime";
  if (file.startsWith("scripts/project/")) return "scriptsProject";
  if (file.startsWith("scripts/test-evidence/")) return "scriptsTestEvidence";
  if (file.startsWith("scripts/validation/")) return "scriptsValidation";
  if (file.startsWith("scripts/")) return "scriptsTooling";
  throw new TypeError(`Project Gate test file has no execution subcheck: ${file}`);
}

function productPackageTestLane(file: string): ProductPackageTestLaneName {
  const matchingLanes = PRODUCT_PACKAGE_TEST_LANES.filter((definition) =>
    definition.prefixes.some((prefix) => file.startsWith(prefix))
  );
  if (matchingLanes.length !== 1) {
    throw new TypeError(`Product package test file has no unique behavior owner lane: ${file}`);
  }
  return matchingLanes[0].lane;
}

function emptyTestLaneFiles(): Record<ProjectGateTestLaneName, string[]> {
  return {
    packageArtifact: [],
    packageCandidate: [],
    packageConsumer: [],
    packageSupporting: [],
    productDuplicateDetection: [],
    productFileMetrics: [],
    productFunctionMetrics: [],
    productJsonChecks: [],
    productMarkdownLinks: [],
    productRuntime: [],
    productSupportingChecks: [],
    scriptsProject: [],
    scriptsTestEvidence: [],
    scriptsTooling: [],
    scriptsValidation: []
  };
}

function freezeTestLanes(
  laneFiles: Readonly<Record<ProjectGateTestLaneName, readonly string[]>>
): ProjectGateTestLanes {
  return Object.freeze({
    packageArtifact: Object.freeze([...laneFiles.packageArtifact]),
    packageCandidate: Object.freeze([...laneFiles.packageCandidate]),
    packageConsumer: Object.freeze([...laneFiles.packageConsumer]),
    packageSupporting: Object.freeze([...laneFiles.packageSupporting]),
    productDuplicateDetection: Object.freeze([...laneFiles.productDuplicateDetection]),
    productFileMetrics: Object.freeze([...laneFiles.productFileMetrics]),
    productFunctionMetrics: Object.freeze([...laneFiles.productFunctionMetrics]),
    productJsonChecks: Object.freeze([...laneFiles.productJsonChecks]),
    productMarkdownLinks: Object.freeze([...laneFiles.productMarkdownLinks]),
    productRuntime: Object.freeze([...laneFiles.productRuntime]),
    productSupportingChecks: Object.freeze([...laneFiles.productSupportingChecks]),
    scriptsProject: Object.freeze([...laneFiles.scriptsProject]),
    scriptsTestEvidence: Object.freeze([...laneFiles.scriptsTestEvidence]),
    scriptsTooling: Object.freeze([...laneFiles.scriptsTooling]),
    scriptsValidation: Object.freeze([...laneFiles.scriptsValidation])
  });
}

function assertCompletePartition(allFiles: readonly string[], lanes: ProjectGateTestLanes): void {
  const partitions = PROJECT_GATE_TEST_LANE_NAMES.map((lane) => lanes[lane]);
  const assignedFiles = partitions.flat();
  if (assignedFiles.length !== new Set(assignedFiles).size) {
    throw new TypeError("Project Gate test execution subchecks contain duplicate files");
  }
  if (
    assignedFiles.length !== allFiles.length ||
    assignedFiles.some((file) => !allFiles.includes(file)) ||
    allFiles.some((file) => !assignedFiles.includes(file))
  ) {
    throw new TypeError("Project Gate test execution subchecks do not cover the complete profile");
  }
  if (partitions.some((files) => files.length === 0)) {
    throw new TypeError("Project Gate test execution subcheck must not be empty");
  }
}
