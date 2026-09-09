# Decision 生命周期、Alignment 与记录边界审计

本报告记录 316 条已建立 Decision 的生命周期 frontier、alignment 与记录边界审计，以及唯一实施的 alignment 变化。

## 结论

- 当前集合为 110 条 active、206 条 archived；206 条 archived 均有直接 successor，110 条 active 均未被 successor 指向。
- 未发现应执行的 archive、reactivate、merge、split、归并、重划、新后继或记录边界变化。
- `260805-keep-sensitive-quality-record-material-ephemeral` 已由 `active/unaligned` 标为 `active/aligned`。
- 当前 active 记录中 108 条 aligned、2 条 unaligned；两条未对齐方向均有明确的未来采用条件。

## 审计契约与覆盖

1. 从 316 份权威 Markdown 与当前索引核对 status、alignment、正文和直接关系端点。
2. 对 110 条 active 逐条判断完整方向是否仍是当前依据、是否已成为事实，以及记录内容能否独立修订、归档或对齐。
3. 对高相似主题、全部 active/unaligned 和拆分、归并、重划集合回读两端正文与当前事实 owner；主题相似不作为合并证据。
4. archived alignment 只表示最后一次历史核对，不用于推断旧方向今天仍适用。

| 切面 | 覆盖与结果 |
| --- | --- |
| established records | 316/316；status 与 alignment 均合法 |
| lifecycle frontier | active 110/110 为图终端；archived 206/206 有 successor |
| active alignment | 108 aligned；2 unaligned |
| 现有拆分、归并、重划 | 50 条边；闭合关系由严格图检查验证 |
| 潜在重复或过粗记录 | 未发现具有相同且不可独立演进的 active 判断 |

## 已实施的 Alignment 变化

`260805-keep-sensitive-quality-record-material-ephemeral` 的完整方向要求 Product-owned producing Check 只在 invocation-owned bounded memory 中处理原始敏感材料，并只发布安全投影。当前唯一适用能力 `secretDetection` 已完整满足该方向：

- [`docs/checks/secret-detection.md`](../../docs/checks/secret-detection.md) 定义 I/O、内存与安全输出边界。
- [`src/package-checks/secret-detection/`](../../src/package-checks/secret-detection/) 拥有实现。
- [`secret-detection.test.ts`](../../src/package-checks/secret-detection/secret-detection.test.ts) 覆盖完整 Run 与 published-output leak canary。
- 目标测试 9/9 通过；公开 export 与 source owner 均存在。

该条件性方向没有未实现的当前适用实例，因此使用 Decision CLI `mark-aligned` 更新 alignment；status、正文和 relations 保持不变。

## 保持 Unaligned 的方向

| Decision ID | 保持原因 |
| --- | --- |
| `260822-require-check-owned-network-authorization` | 当前没有 Product-owned network Check；空适用面或离线实现不能证明未来 opt-in 方向已成为事实。 |
| `260903-permit-evidence-backed-host-primitive-optimization-in-lizard-port` | 当前仍以 built-in `RegExp` 为基线，尚未采用任何需独立 parity、package 与 performance 验收的 host primitive 候选。 |

## 保持不变的记录边界

- archived 记录保存真实演进路径，且均由当前图中的 successor 承接；本轮没有删除或恢复旧方向的依据。
- 产品实现一个既有方向时更新 alignment，不创建伪造的“实现后继”。
- Project Definition 输入绑定与 caller-runtime 执行、Scheduler Hook 与 Invocation strategy lifecycle 等相近主题具有不同 owner，可独立演进，因此保持分立。
- 关系 summary 与 tags 分别由相邻审计报告承接，不从 frontier 拓扑外推其语义。

## 验证

- `bun run decisions -- check` 验证当前 316 条记录、110/206 lifecycle 分布和 108/2 active alignment 分布。
- `bun test src/package-checks/secret-detection/secret-detection.test.ts` 在 alignment 变化前通过 9 项目标测试。
- 最终 skill、Investigation、类型检查和 Project Gate 均已通过；完整命令与计数见 AI-ready 复审的验证结果。
