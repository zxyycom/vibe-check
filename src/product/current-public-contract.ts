/**
 * The single definition-facing owner for values that a project imports or
 * observes before the package/release projection exists.  This is deliberately
 * package-private: a later public entry projects these literals as exports and
 * declarations without introducing a second list of names.
 */
export const CURRENT_PUBLIC_CONTRACT = Object.freeze({
  packageImport: "vibe-check",
  operations: Object.freeze({
    configDefinition: "defineConfig",
    packageRun: "run"
  }),
  types: Object.freeze({
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
  operationalDependencies: Object.freeze({
    duplication: Object.freeze({ environment: "VIBE_CHECK_JSCPD_CMD" }),
    file: Object.freeze({ environment: "VIBE_CHECK_SCC_CMD" }),
    function: Object.freeze({ environment: "VIBE_CHECK_LIZARD_CMD" })
  })
} as const);

export type OperationalDependencyId = keyof typeof CURRENT_PUBLIC_CONTRACT.operationalDependencies;
