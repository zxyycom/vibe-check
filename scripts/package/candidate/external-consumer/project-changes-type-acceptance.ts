/** Type-level external-consumer fixtures for project changes and the change-aware preparation context. */
export const PROJECT_CHANGES_TYPE_ACCEPTANCE_SOURCE = `import {
  all,
  any,
  changeFlag,
  exactlyOne,
  none,
  not,
  notAll
} from "@zxyycom/vibe-check";

const sourceChanges: ProjectChangesConfiguration = {
  flags: {
    source: {
      exclude: ["src/generated/**"],
      include: ["src/**"]
    } satisfies ProjectChangeFlagRegion
  },
  source: { compareWith: "origin/main" } satisfies ProjectChangeSource
};
const changeEvidence: ProjectChanges = { ok: true, files: [] };
const sourceChangeFlag: "vibe-check:change:source" = changeFlag("source");
const changeCondition: CheckFlagCondition = any(
  all("caller-requested", sourceChangeFlag),
  none(notAll("maintenance", not("force")), exactlyOne("fast-path", "slow-path"))
);
const rawChangeCondition: CheckFlagCondition = {
  kind: "any",
  conditions: [
    { kind: "all", conditions: ["caller-requested", sourceChangeFlag] },
    {
      kind: "none",
      conditions: [
        { kind: "not-all", conditions: ["maintenance", { kind: "not", condition: "force" }] },
        { kind: "exactly-one", conditions: ["fast-path", "slow-path"] }
      ]
    }
  ]
};
const changeAwareCheck = defineCheck({
  checkId: "isolated-change-aware",
  displayName: "Isolated change aware",
  enabledByFlags: {
    when: changeCondition,
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
void [changeAwareDefinition, changeEvidence, rawChangeCondition];
`;
