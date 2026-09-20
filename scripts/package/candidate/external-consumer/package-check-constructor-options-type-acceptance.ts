/** Public consumer source that proves package constructors share configurable Check declarations. */
export const PACKAGE_CHECK_CONSTRUCTOR_TYPE_ACCEPTANCE_SOURCE = String.raw`const primaryFileMetricsDeclaration: PackageCheckAuthoringOptions<"isolated-file-metrics-primary"> = {
  checkId: "isolated-file-metrics-primary",
  maxParallel: 1,
  omitQuietPassedRow: false
};
const isolatedPrimaryFileMetrics = fileMetrics({
  ...primaryFileMetricsDeclaration,
  codeAreas: {
    source: { files: { include: ["src/**/*.ts"] } }
  }
});
const isolatedSecondaryFileMetrics = fileMetrics({
  checkId: "isolated-file-metrics-secondary",
  codeAreas: {
    source: { files: { include: ["src/**/*.ts"] } }
  }
});
const isolatedFunctionMetrics = functionMetrics({
  checkId: "isolated-function-metrics",
  codeAreas: {
    source: { files: { include: ["src/**/*.ts"] } }
  }
});
const defaultFileMetricsCheckId: "file-metrics" = fileMetrics().checkId;
const defaultMaintenanceCheckId: "maintenance-reminders" = maintenanceReminders({ entries: [] }).checkId;
// @ts-expect-error a custom generic identity requires its matching runtime checkId.
fileMetrics<"missing-file-metrics-id">();
// @ts-expect-error a custom generic identity requires its matching runtime checkId.
maintenanceReminders<"missing-maintenance-id">({ entries: [] });
void [defaultFileMetricsCheckId, defaultMaintenanceCheckId];
`;

/** Public consumer source that proves maintenance object authoring retains its literal identity. */
export const MAINTENANCE_REMINDERS_TYPE_ACCEPTANCE_SOURCE = String.raw`const reminderInput: MaintenanceRemindersInput<"isolated-maintenance-reminders"> & { readonly checkId: "isolated-maintenance-reminders" } = {
  checkId: "isolated-maintenance-reminders",
  entries: [
    {
      id: "isolated-maintenance-reminder",
      baseCommit: "0000000000000000000000000000000000000000",
      limits: { commits: 1 },
      message: "Review isolated consumer maintenance."
    }
  ],
  omitQuietPassedRow: false
};
const reminder = maintenanceReminders(reminderInput);
`;
