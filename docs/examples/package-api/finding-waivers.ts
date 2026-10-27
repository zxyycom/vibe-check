// #region package-api-example:finding-waiver-results
import { reconcileFindingWaivers } from "@zxyycom/vibe-check";

const reconciled = reconcileFindingWaivers({
  findings: [
    { path: "src/client.ts", symbol: "createClient" },
    { path: "src/client.ts", symbol: "removeClient" }
  ],
  identify: ({ path, symbol }) => ({ path, symbol }),
  waivers: [
    {
      identity: { path: "src/client.ts", symbol: "createClient" },
      reason: "兼容窗口内保留此项。"
    },
    {
      identity: { path: "src/client.ts", symbol: "legacyCall" },
      reason: "待复核的既有配置。"
    }
  ]
});

// overmatched 仍需处理，只有 waived 可以从待处理集合中移出。
const pendingFindings = reconciled.findings
  .filter(({ disposition }) => disposition !== "waived")
  .map(({ finding }) => finding);
const waivedReasons = reconciled.findings.flatMap((result) =>
  result.disposition === "waived" ? [result.waiver.reason] : []
);
const waiversToReview = reconciled.waiverAudits
  .filter(({ status }) => status !== "applied")
  .map(({ waiver, matchCount, status }) => ({
    identity: waiver.identity,
    matchCount,
    status
  }));
// #endregion package-api-example:finding-waiver-results

if (
  pendingFindings.length !== 1 ||
  waivedReasons.length !== 1 ||
  waiversToReview.length !== 1 ||
  reconciled.waiverAudits.find(({ status }) => status === "unused")?.matchCount !== 0
) {
  throw new Error("Unexpected Finding waiver reconciliation");
}

// #region package-api-example:finding-waiver-overmatched
const broad = reconcileFindingWaivers({
  findings: [
    { path: "src/json.ts", symbol: "parse" },
    { path: "src/text.ts", symbol: "parse" }
  ],
  identify: ({ symbol }) => ({ symbol }),
  waivers: [
    { identity: { symbol: "parse" }, reason: "演示缺少 path 的过宽 identity。" }
  ]
});
const broadAudit = broad.waiverAudits[0];
const stillPending = broad.findings.filter(({ disposition }) => disposition !== "waived");
// #endregion package-api-example:finding-waiver-overmatched

if (
  broadAudit?.status !== "overmatched" ||
  broadAudit.matchCount !== 2 ||
  stillPending.length !== 2 ||
  stillPending.some(({ disposition }) => disposition !== "overmatched")
) {
  throw new Error("A broad waiver must leave both Findings pending");
}
