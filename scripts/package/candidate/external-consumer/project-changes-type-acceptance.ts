/** Type-level external-consumer fixtures for project changes and the change-aware preparation context. */
export const PROJECT_CHANGES_TYPE_ACCEPTANCE_SOURCE = `const sourceChanges: ProjectChangesConfiguration = {
  flags: {
    source: {
      exclude: ["src/generated/**"],
      include: ["src/**"]
    } satisfies ProjectChangeFlagRegion
  },
  source: { compareWith: "origin/main", kind: "git" } satisfies ProjectChangeSource
};
const changeEvidence: ProjectChanges = { ok: true, files: [] };
const changeAwareCheck = defineCheck({
  checkId: "isolated-change-aware",
  displayName: "Isolated change aware",
  enabledByFlags: {
    when: {
      kind: "all",
      conditions: [
        { kind: "flag", flag: "caller-requested" },
        { kind: "flag", flag: "vibe-check:change:source" }
      ]
    } satisfies CheckFlagCondition,
    propagateDependsOn: true
  } satisfies CheckFlagEnablement,
  options: { evidenceAvailable: false },
  prepare: (options, _signal, project) => ({
    preparedOptions: { ...options, evidenceAvailable: project?.changes?.ok === true },
    status: "success"
  }),
  execute: ({ options, project }) => ({
    data: {
      evidenceAvailable: options.evidenceAvailable,
      fileCount: project.changes?.ok === true ? project.changes.files.length : 0
    },
    status: "passed"
  })
});
const changeAwareDefinition = defineConfig({
  changes: sourceChanges,
  checks: [changeAwareCheck]
});
void [changeAwareDefinition, changeEvidence];
`;
