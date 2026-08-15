/**
 * The single definition-facing owner for values that a project imports or
 * observes before invoking Package Run. This is deliberately package-private:
 * Product modules consume these literals directly rather than maintaining a
 * second list of public names and defaults.
 */
export const OPERATIONAL_DEPENDENCY_IDS = Object.freeze([
  "duplication",
  "file",
  "function"
] as const);

export type OperationalDependencyId = typeof OPERATIONAL_DEPENDENCY_IDS[number];

const OPERATIONAL_DEPENDENCIES = Object.freeze({
  duplication: Object.freeze({ environment: "VIBE_CHECK_JSCPD_CMD" }),
  file: Object.freeze({ environment: "VIBE_CHECK_SCC_CMD" }),
  function: Object.freeze({ environment: "VIBE_CHECK_LIZARD_CMD" })
} as const satisfies Readonly<Record<OperationalDependencyId, Readonly<{
  environment: string;
}>>>);

export const CURRENT_PUBLIC_CONTRACT = Object.freeze({
  packageImport: "vibe-check",
  operations: Object.freeze({
    configDefinition: "defineConfig",
    packageRun: "run",
    builtInCheckReplacement: "replace",
    builtInCheckAppend: "append"
  }),
  values: Object.freeze({
    duplicateDetection: "duplicateDetection",
    fileMetrics: "fileMetrics",
    functionMetrics: "functionMetrics"
  }),
  types: Object.freeze({
    builtInCheck: "BuiltInCheck",
    checkGroup: "CheckGroup",
    checkNode: "CheckNode",
    customCheck: "CustomCheck",
    projectDefinition: "ProjectDefinition",
    runControls: "RunControls",
    runResult: "RunResult"
  }),
  effectDefaults: Object.freeze({
    cache: Object.freeze({
      directory: ".cache/vibe-check",
      enabled: true
    }),
    logs: Object.freeze({ enabled: true }),
    output: Object.freeze({
      directory: "artifacts/vibe-check",
      enabled: true
    }),
    progress: Object.freeze({ enabled: true })
  }),
  operationalDependencies: OPERATIONAL_DEPENDENCIES
} as const);
