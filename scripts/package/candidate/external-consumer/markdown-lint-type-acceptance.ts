/** Installed consumer evidence for precise Markdown lint waiver authoring and Record narrowing. */
export const MARKDOWN_LINT_TYPE_ACCEPTANCE_SOURCE = String.raw`const lintIdentity: MarkdownLintFindingIdentity = {
  path: "docs/source.md",
  rule: "no-missing-space-atx",
  range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
};
const lintWaiver: MarkdownLintFindingWaiver = {
  identity: lintIdentity,
  reason: "Reviewed literal Markdown syntax example."
};
const preciseLint = markdownLint({
  checkId: "isolated-precise-lint",
  findingPolicy: "blocking",
  findingWaivers: [lintWaiver]
});
const preciseLintId: "isolated-precise-lint" = preciseLint.checkId;
const lintFinalData: MarkdownLintFinalData = preciseLint.parseData({
  sourceFileCount: 1, findingCount: 1, rejectedInputCount: 0
});
const lintAudit: MarkdownLintFindingWaiverAuditRecordData = {
  kind: "finding-waiver-audit",
  identity: lintIdentity,
  reason: lintWaiver.reason,
  matchCount: 0,
  status: "unused"
};
function inspectLintRecord(record: MarkdownLintRecordData): string {
  switch (record.kind) {
    case "lint-finding": return record.waiver?.reason ?? record.rule;
    case "finding-waiver-audit": return record.status;
    case "input-rejected": return record.reason;
  }
}
// @ts-expect-error resolved waivers are immutable arrays.
preciseLint.options.findingWaivers.push(lintWaiver);
// @ts-expect-error exact identities require the full range, not only the start.
const incompleteLintIdentity: MarkdownLintFindingIdentity = { path: "docs/source.md", rule: "no-missing-space-atx" };
const backendRuleIdentity: MarkdownLintFindingIdentity = {
  ...lintIdentity,
  // @ts-expect-error backend codes are not public Markdown lint rules.
  rule: "MD018"
};
void [preciseLintId, lintFinalData, lintAudit, inspectLintRecord, incompleteLintIdentity, backendRuleIdentity];
`;
