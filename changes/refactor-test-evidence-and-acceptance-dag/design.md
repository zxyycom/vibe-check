# Design

本设计把语义证据治理与执行复用分成正交层，并用现有 ordinary Check typed dependency 和静态 scheduler 构造 package acceptance DAG。

## Context

项目当前有完整 Test Evidence static/runtime/Case closure，Case 按 owner 契约与可观察结果划分；闭合只证明映射存在，不证明语义合理。Product 已支持 direct dependency、typed provider parser、四态 settlement、mutex、root capacity 和 cancellation。Project Gate 将 prepared candidate 作为 required typed provider；artifact 直接消费它，而 external-consumer provider 曾把安装与 type/docs/runtime 验收封装在单一 Bun process 内。

## Goals / Non-Goals

目标是修复 Case 语义、消除真正重复的测试证据、让 external-consumer 共同物理安装只执行一次并把下游验收拆成独立 Check。非目标是按文件数机械拆分、把所有 fixture 提升为 Check、共享 acceptance verdict、改变 Product 公共 API，或在未测量前建立跨主机固定性能预算。

## Decisions

### Intended Change

- Case 层独立判断 Owner、Proves、可证伪性、证据独立性和维护价值；执行 DAG 不决定 Case 边界。
- 只有 invocation-owned、可验证、可序列化且有多个真实消费者的共同结果提升为 typed provider data。消费者只读取自己需要的字段，不能通过共享 verdict 跳过独立验收。
- External consumer 拆为 install provider 与 type/docs/runtime consumers；candidate policy 与 physical mutation 分离。共享 mutable lifecycle 时必须使用显式依赖链、资源 owner 和 cleanup，而非 ambient path/receipt。
- Test execution partition 继续从完整 supported profile 导出并保证 union 完整、intersection 为空。拆出的 process Checks 使用独立 identity，但每个 Bun test 实体只执行一次。
- 删除测试前指出剩余直接证据；Case 变化按语义连续性维护 ID，只有 owner requirement 或可观察结果真正分裂时新建 Case。

### Resulting Impacts

- Provider data 需要 closed versioned parser、path/digest/containment validation 和 invocation-local lifetime；无效 upstream data 必须在 child start 前 fail closed。
- Install 或其它临时 material 需要由 bound Gate Run 在所有 dependents settle 后通过 `finally` cleanup；cleanup 失败不能伪装成 acceptance success。
- 新增子 Check 会增加 process startup 与调度节点；保留它们的理由是独立故障定位与共享一次安装。测量只评估性能影响，不决定 Case 语义是否成立。
- Gate membership、help/profile/tag 输出、aggregation 和测试需同步新 identity，且 package acceptance opt-in 边界不变。
- Case 账本在测试实体稳定后统一更新，避免并行源码改动产生临时错误映射。

## Risks / Trade-offs

跨进程共享临时安装可能引入生命周期泄漏、路径注入、并发只读假设或 correlated evidence。通过 invocation-owned directory、typed digest/containment、只读 consumers、bound Run `finally` cleanup 与物理 mutation mutex 收敛风险。过细子 Check 也可能增加 Bun startup；最终以同 membership 重复 A/B 决定是否保留每个拆分。

## Open Questions

无。Artifact acceptance 保持 prepared candidate 的 direct consumer，并独立执行 staging material audit；当前没有第二个 material provider 或拆分它的共同运算边界。
