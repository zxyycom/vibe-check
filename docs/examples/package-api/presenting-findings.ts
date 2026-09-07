// #region package-api-example:presenting-findings
import { presentCheckFindings } from "@zxyycom/vibe-check";

const findings = [
  { blocking: true, line: 12, path: "src/config.ts", summary: "Missing required value" },
  { blocking: false, line: 8, path: "src/legacy.ts", summary: "Deprecated option" }
];

const messages = presentCheckFindings({
  findings,
  limit: 1,
  message: (finding) => ({
    code: "finding-detail",
    level: finding.blocking ? "error" : "warning",
    message: `${finding.path}:${finding.line} ${finding.summary}`
  }),
  omittedMessage: ({ omittedCount, omittedFindings, presentedCount, totalCount }) => ({
    code: "findings-omitted",
    level: omittedFindings.some((finding) => finding.blocking) ? "error" : "warning",
    message: `${omittedCount} more of ${totalCount} findings after the first ${presentedCount}`
  })
});

if (messages.length !== 2 || messages[1]?.code !== "findings-omitted") {
  throw new Error("Expected one Finding message and one overflow message");
}

const terminalResult = { status: "failed" as const, data: { findings }, messages };
void terminalResult; // The producing Check attaches these messages to its terminal result.
// #endregion package-api-example:presenting-findings
