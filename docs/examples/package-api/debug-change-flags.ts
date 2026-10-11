// #region package-api-example:debug-change-flags
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changeFlag, debugChangeFlags, formatChangeFlagDebugReport } from "@zxyycom/vibe-check";

const projectRoot = mkdtempSync(join(tmpdir(), "change-flags-example-"));
try {
  for (const path of ["a.ts", "b.ts", "zero.txt"]) {
    writeFileSync(join(projectRoot, path), "example\n");
  }
  const report = debugChangeFlags({
    projectRoot,
    selection: { patterns: ["*"] },
    regions: {
      source: { patterns: ["*.ts"] },
      extra: { patterns: ["a.ts"] },
      empty: { patterns: [] }
    }
  });
  if (report.files.map(({ hitCount }) => hitCount).join(",") !== "2,1,0") {
    throw new Error("Expected overlapping, single and zero hits in the complete selected universe");
  }
  if (report.filesForFlag(changeFlag("source"))?.join(",") !== "a.ts,b.ts" ||
      report.flagsForFile("zero.txt")?.length !== 0 || report.flagsForFile("outside.txt") !== undefined) {
    throw new Error("Expected bidirectional results and distinct unknown paths");
  }
  const text = formatChangeFlagDebugReport(report); // 返回文本，不自动输出。
  if (!text.includes('"zero.txt" 命中=0 flags=[]') || !Object.isFrozen(report.scope)) {
    throw new Error("Expected explicit presentation and immutable range metadata");
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}
// #endregion package-api-example:debug-change-flags
