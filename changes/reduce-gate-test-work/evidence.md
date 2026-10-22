# 实施与测量证据

2026-10-21 的包测试减重与 Product 测试选择验收记录。设计与当前范围见 [design](design.md)。

## 结果摘要

包测试进程中位数 1,984.01→1,258.99 ms；固定 required workload 中位数 22,795.40→17,341.58 ms，选择由 25→19 Checks。前者是完整测试进程，后者是固定路径的受控 Checks 执行，分别解读，不叠加收益。

## 操作与选择

- artifact manifest 测试从 7 次完整 fingerprint 降到 5 次；相邻未变化输入直接复用局部值。compiler fingerprint 从 3 次降到 2 次，仍有两次独立计算证明确定性。
- compiler manifest 边界矩阵从 9 个隔离 child 降到 1 个；保留合法、7 类非法与畸形 JSON 错误/路径断言，末尾恢复合法 manifest 再验证成功。真实 TS7/TS6 两次 CLI 和 TS6 AST API 均保留，因此总 child 从 11 个降到 3 个。
- required 仅缩窄 Product 已知 owner 目录的 `*.test.ts`。host-environment/project-files 测试归 supporting Checks；JSON 测试正文不再唤起 file-metrics；已知 Check 测试正文不再唤起 runtime。共享实现、test-support、fixture、未知目录和近似前缀均保守保留。当前没有跨组 import 测试正文的消费者；非 import 的 source-identity 全树读取仍由 function-metrics 完整选择承接。
- 该轮尚未收窄其它 scripts regions；后续脚本选择见 [refine-script-test-regions](../refine-script-test-regions/evidence.md)。该轮完整 lane registry、Check membership、scheduler、预算、test/all 强制路径及 Git unavailable 机制不改。每个当前 Product lane（含 runtime）的完整文件清单都有自身 region 证明；矩阵另覆盖删除形状、helper、未知路径和跨 owner 输入。

## 前后测量

2026-10-21，Linux x64、6 logical CPU、mise Bun 1.3.14；两阶段使用同一个已准备 candidate `0.0.0-local.7de95ed6b493`。前序已完成的进程时钟、transcript 握手与 Markdown fixture 优化同时存在于 before/after，不计入本轮收益。

复现命令（before 在修改前执行）：`mise exec -- bun run changes/reduce-gate-test-work/measure.mjs before` / `after`。源摘要、环境和逐样本结果分别保存在同目录的 `before-measurements.json`、`after-measurements.json`，原 region 快照为 `before-policy.json`；脚本和 JSON 属本 Change 的实验交接材料，随未来获授权的 Change finalize 清理，不新增长期 Gate 入口。

| Workload | Before median（min–max） | After median（min–max） | Observation |
| --- | --- | --- | --- |
| 两个包测试文件的进程 wall time，warmup 1 + measured 5 | 1,984.01 ms（1,789.42–2,019.99） | 1,258.99 ms（1,207.49–1,317.14） | -725.02 ms / -36.5% |
| compiler 工具链测试单项 | 749.45 ms（674.94–778.78） | 260.22 ms（243.83–278.75） | -65.3% |
| manifest fingerprint 测试单项 | 884.38 ms（814.20–905.87） | 680.48 ms（659.34–748.57） | -23.1% |
| 固定 changed-path 的 Gate Checks workload，warmup 1 + measured 3 | 22,795.40 ms（22,754.55–22,971.75） | 17,341.58 ms（15,962.65–21,361.97） | 25→19 selected Checks；-5,453.83 ms / -23.9% |

固定路径为 `src/package-checks/host-environment/process/runner.test.ts`。只移除 duplicate、file-metrics、JSON、Markdown、secret、runtime 六个不消费该正文的 Product test lanes，supporting 与 function-metrics 仍执行。selection 样本通过 exact candidate 的公共 API 执行现有 Gate Checks，保持真实 dependency、mutex、named resource budgets 和 maxParallel=3，但使用 default static admission 而非正式 Gate 的 learned admission；不含 preparation、Git acquisition、adapter 或 contributor 时间。这是本轮两项优化加选择收窄的组合收益，不单独归因于 selection。

共享机器有其它聊天的 profiling / 100k 数据操作争用，after selection 范围明显变宽；多样本中位数只作为本 workload observation，不作预算或正式 Gate 端到端提速承诺。操作数减少和完整验收范围保留另由 diff/测试直接证明。

## 验收与文档影响

- 目标包测试、eligibility、definition 和 run tests：38 passed / 0 failed。
- `bun run test-evidence -- check --root .`：766 entities 全部映射到 190 Cases，身份无增删。
- `bun run validate`、`bun run decisions -- check`、本 Change check 和 `git diff --check` 已通过；正式 Gate 同时覆盖 Product/scripts typecheck、lint、format 和所有 test lanes。
- `bun run check`：30 passed / 13 not-applicable / 0 failed / 0 unavailable；elapsed 25.6 s。当时的混合 diff 比受控场景更宽；mean 2,043.2 ms、P95 5,478.3 ms 仍告警。
- `bun run check -- --all`：43 passed / 0 failed / 0 unavailable；elapsed 32.6 s。包含 artifact 和全部 external-consumer 验收；mean 1,948.0 ms 位于预算内，P95 5,548.1 ms 仍告警。最慢三项为 function-metrics 5,921.4 ms、Product Markdown tests 5,739.8 ms、external-consumer preparation 5,548.1 ms；预算未放宽。
- 正式 Gate 控制台留在 `.log/gate-test-work/validation-IF7dDx/`，正式 invocation 分别为 `.log/project-gate/2026-10-21T10-27-43.629Z-2495357-adea5cf8-d8db-49cb-9d09-0c90a0e99fe5`、`.log/project-gate/2026-10-21T10-28-10.356Z-2497635-4deee7db-0953-4709-8013-fc57ed3f53db`。
- 内部 Gate owner 与现有选择 Case 已更新；公开用户材料无需修改，因为没有 Product API、runtime 行为、产物契约或发布材料变化。非实施代理 `gate_scope_review` 从实际 diff 反查包测试证明、当前跨组消费者、非 import 读取、强制/回退边界和文档，未发现阻断或非阻断问题；其审查只读，未冒充重跑验证。
- 未运行单独 cold candidate integration；本轮不改 preparation 实现，完整 Gate 已实际执行 exact artifact/consumer acceptance。该轮记录形成时尚未 stage、commit 或 finalize；其它会话的 Investigation 保持原样。
