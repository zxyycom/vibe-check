本 tasks 将 scanner completeness contract 拆成可验证步骤；当前 change 仅在 `openspec/changes/make-scan-completeness-observable/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## 1. 阻塞级实现前审计

- [ ] 1.1 审计 proposal、design、`scan-completeness` capability、全部 modified specs 与本 tasks 是否围绕“结果必须说明每项 planned capability 是否可信完成”这一核心句；确认 capability ID 合规、本 change 仍是临时计划、未修改其它 docs/specs、验证覆盖 no-input/profile-skip/unavailable/failed/succeeded，并确认现有 exact-input 规范的实现缺口已作为直接 bug fix 合入且有回归证明。该门禁完成前不得执行任何 2.x 及后续实现任务。
- [ ] 1.2 回答 design 中显式与自动 baseline measurement 不完整时的 outcome 问题，将答案写入 Decision 和 specs，并删除已回答的 Open Question。
- [ ] 1.3 保存 missing-scc smoke 和当前 false-green artifacts，固定预期从 `passed` 改为 completeness failure。

## 2. Capability planning model

- [ ] 2.1 定义 `file-metrics`、`function-metrics` 与 `duplicate-detection` IDs、plan record 和状态枚举。
- [ ] 2.2 在 normalized scope 完成后按 profile、eligible inputs 与 area tasks 构造 capability plan。
- [ ] 2.3 只为有输入且 planned 的 capability 执行 availability check。
- [ ] 2.4 为 plan/state transitions 和 invalid combinations 增加 model validation tests。

## 3. Runtime and aggregation

- [ ] 3.1 将 scc、function metrics 与 jscpd adapters 的 no-input、unavailable、succeeded 和 failed 投影到 capability records。
- [ ] 3.2 从 capability records 计算 overall `complete`、`empty` 或 `failed`。
- [ ] 3.3 阻止 unavailable/failed measurement 以 zero 或 empty array 参与可信 aggregation。
- [ ] 3.4 让 quality status 只在 complete/empty 后计算 passed/warning，并让 failed completeness 返回 core failed。
- [ ] 3.5 按审计后的 baseline policy处理 current 与 comparison completeness。

## 4. Output and CLI

- [ ] 4.1 在 metrics model、report 和 console 中投影同一 capability plan与 overall completeness。
- [ ] 4.2 为每个 unavailable/failed capability提供 component、phase、reason和可行动恢复提示。
- [ ] 4.3 更新 CLI status mapping，使 incomplete measurement退出 `2`且不打印绿色 completion。
- [ ] 4.4 更新 output validation，拒绝 status、metrics与 completeness相互矛盾的 envelope。

## 5. Proof and verification

- [ ] 5.1 增加 quick profile skip、legitimate empty、missing scc/lizard/jscpd、execution failure与complete scan入口 tests。
- [ ] 5.2 更新 Quality Metrics、Output、CLI、Scanner Dependencies、Testing owner和case ledger。
- [ ] 5.3 运行 product tests、typecheck、lint和 missing-tool/no-input smoke。
- [ ] 5.4 运行 `bun run validate`、`bun run verify:vibe-check-workspace:required` 与真实 quick/full scan。
- [ ] 5.5 运行 OpenSpec strict validation并汇总 capability state与CLI outcome证据。
