# Tasks

任务先闭合 owner 与 provider 边界，再实施互斥写入切面，最后统一修复 Case 并完成工作区验证。

## Readiness

- [x] 0.1 读取测试策略、Case owner、编码规范、Project Gate owner 与现有 typed-provider/调度决策，并确认起点 Case closure。
- [x] 0.2 将 Case 语义治理与性能/执行 DAG 分离，明确 provider 输出、consumer、mutation、cleanup 和独立验收边界。

## Implementation

- [x] 1.1 实施 package acceptance typed provider/consumer DAG，并同步 Gate identity、selection、timeout、mutex、transcript 与目标测试。
- [x] 1.2 删除或合并高置信重复测试，并保留更强直接证据与正式 root 入口验证。
- [x] 1.3 按最终测试实体重构受影响语义 Case，修复 Owner/Proves/Topic/映射并同步稳定行为 owner。
- [x] 1.4 建立或演进长期决策，记录 acceptance provider DAG、独立验收与共享边界。

## Verification

- [x] 2.1 运行最窄 package/Gate、Product、validation、Test Evidence 目标测试和完整 Case closure。
- [x] 2.2 运行 format、product/scripts typecheck、lint、docs/decision/change-plan 验证与 required Gate。
- [x] 2.3 运行 full Gate，并按相同 membership/warmed candidate 做五次交错 A/B 或记录无法完成的测量边界。

## Verification Evidence

- 定向集成测试覆盖 Gate process typed success、provider provenance、closed material parser、三条 external consumers、Definition/adapter、真实 process cancellation/timeout、Definition defaults、Test Evidence catalog 与 docs validation，46/46 通过。
- Product/scripts typecheck 与 lint、全仓 format、docs validation、Decision Records、Change Plan 和 Test Evidence closure 均通过；账本闭合为 241/241 entities、76 Cases、9 topics。
- 编码规范与 AI-ready 文档复审后的最终 Required Gate 通过：33 Checks 中 27 passed、6 个 `package-tests` Checks not applicable，elapsed 7.3s；最终 Full Gate 通过：33/33，elapsed 13.8s。Full 后没有遗留 invocation-owned external-consumer root；candidate lifecycle、artifact、external-consumer provider 与三条 consumers 均有独立 transcript。
- A/B 使用 base commit `df86316` 的独立 detached worktree 与独立 `node_modules`，两侧先暖 candidate，再交错执行等价 `full` behavior membership。旧单体 consumer 与新 provider + 三 consumer 的 Check 拓扑不同，这正是实验变量；两侧 supported test surface 保持完整。

| 样本 | 基线 full / external consumer | 当前 full / provider + 最慢 consumer |
| --- | --- | --- |
| 1 | passed 40.2s / 9.4s | passed 27.8s / 6.9s |
| 2 | passed 10.3s / 3.2s | passed 16.2s / 5.6s |
| 3 | passed 10.1s / 3.4s | passed 10.9s / 3.38s |
| 4 | failed 50.5s（candidate lifecycle 30s timeout）/ 18.5s | passed 11.8s / 3.39s |
| 5 | passed 11.5s / 2.6s | passed 10.3s / 3.33s |

五次样本中，基线/当前 full elapsed 中位数分别为 11.5s/11.8s，external-consumer critical path 中位数约为 3.4s/3.39s；当前拆分没有证明整体中位数加速，但在保持该关键路径基本不变的同时把 install、types、docs、runtime 失败分开。基线 4/5 通过、当前 5/5 通过，观察范围分别为 10.1–50.5s 与 10.3–27.8s；样本量不足以把稳定性差异归因于本次改动，candidate lifecycle 仍是主要波动源。
