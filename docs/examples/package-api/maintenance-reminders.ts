// #region package-api-example:maintenance-reminders
import { defineConfig, maintenanceReminders, run } from "vibe-check";

// 下列 baseCommit 都是示例占位值；实际使用时，每条都必须替换为该提醒最近一次真实复核对应的完整 commit ID。
const maintenance = maintenanceReminders([
  {
    id: "documentation-review",
    baseCommit: "0123456789abcdef0123456789abcdef01234567",
    limits: { commits: 40, changedLines: 2_000 },
    message: "Review the documentation structure after this body of change."
  },
  {
    id: "optimization-audit",
    baseCommit: "89abcdef0123456789abcdef0123456789abcdef",
    limits: { commits: 80 },
    message: "Audit optimization quality before this becomes older.",
    mode: "enforcing"
  }
]);

const definition = defineConfig({
  checks: [maintenance],
  effects: {
    cache: { enabled: false },
    output: { enabled: false },
    progress: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
// #endregion package-api-example:maintenance-reminders
