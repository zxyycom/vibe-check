# Proposal

在一次 maintenanceReminders execute 内按需复用成功的 Git 历史测量，保留失败恢复与取消边界。

## Why

[复杂度调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)的候选：K06 对重叠 reminder 基线重复运行共同 commits 的 diff-tree；正常 Git calls 为 2+R+Σki，且每个结果仍必须保留完整 changedLines。

## Outcome

重复基线的多个提醒得到完全相同的有序 assessments/messages，但成功历史测量仅按需完成一次；失败条目不污染后续恢复。

## Scope

### Intended Change

每次 execute 在 history 成功后创建 private measurement session，持有 first-occurrence history index、成功 base→index Map 和已验证 cumulative changedLines prefix。

### Resulting Impacts

每个 entry、cache hit 和 prefix 扩展处保留 signal 检查；base/numstat failure、malformed、overflow、cancel 不缓存为后续结果。维持 first-parent 逐 commit diff、advisory/enforcing、作者原 base spelling 与排序，不新增公开缓存配置。

## Success Criteria

1. 第二批 before 在已优化的第一批 Run 上冻结；同 harness/fixture/runtime 的 after 与独立计数说明收益或噪声，不混入第一批收益。
2. 目标行为测试、独立正确性/文档影响审查、Case 完整性与最终完整 Gate 通过；公开语义不扩张。
3. 形成时证据交接 Investigation `261012-verify-priority-complexity-optimizations`；无未授权 Git 写入或 Change 删除。

## Affected Owners

[Maintenance Reminders](../../docs/checks/maintenance-reminders.md)、`src/package-checks/maintenance-reminders/**` 与 quality-runtime 的 `WB-MAINTENANCE-REMINDER-ASSESSMENT-001`。
