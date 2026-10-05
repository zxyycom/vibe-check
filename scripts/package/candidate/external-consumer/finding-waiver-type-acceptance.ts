/** Installed declaration evidence for optional waiver authoring and complete results. */
export const FINDING_WAIVER_TYPE_ACCEPTANCE_SOURCE = `
const noWaiverInput: ReconcileFindingWaiversOptions<{ id: string }, string> = {
  findings: [{ id: "public-finding" }],
  identify: (finding) => finding.id
};
const noWaiverResult: FindingWaiverReconciliation<{ id: string }> =
  reconcileFindingWaivers(noWaiverInput);
reconcileFindingWaivers({ ...noWaiverInput, waivers: undefined });
reconcileFindingWaivers({ ...noWaiverInput, waivers: [] });
reconcileFindingWaivers({
  ...noWaiverInput,
  waivers: [{ identity: "public-finding", reason: "Reviewed exception." }]
});
const inferredReconciliation: FindingWaiverReconciliation<{ path: string }> =
  reconcileFindingWaivers({
    findings: [{ path: "src/example.ts" }],
    identify: (finding) => ({ path: finding.path })
  });
const optionalWaivers: ReconcileFindingWaiversOptions<{ id: string }, string>["waivers"] = undefined;
reconcileFindingWaivers({ ...noWaiverInput, waivers: optionalWaivers });
// @ts-expect-error findings remain required when waivers are omitted.
reconcileFindingWaivers({ identify: (finding: { id: string }) => finding.id });
// @ts-expect-error identify remains required when waivers are omitted.
reconcileFindingWaivers({ findings: [{ id: "public-finding" }] });
// @ts-expect-error null is not a valid waiver configuration.
reconcileFindingWaivers({ ...noWaiverInput, waivers: null });
// @ts-expect-error reconciliation results remain complete and readonly.
noWaiverResult.waiverAudits.length = 0;
void inferredReconciliation;
`;
