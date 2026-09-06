# Tasks

任务先闭合 owner 与投影来源，再实施三类材料修正，最后验证源码、生成 candidate 与 consumer 入口一致。

## Readiness

- [x] 0.1 核对 package documentation、JSDoc、public surface 与 package lifecycle owner，并确认本 Change 不改变 Product runtime 或 root exports。
- [x] 0.2 确认八项最小示例由 Check guide 直接拥有，且 npm metadata 属于本次不调整的 closed manifest contract。
- [x] 0.3 从实际 AI 消费任务复核剩余局部发现性缺口，并限定为 controls、cache、公开 final data 与直接 callback DTO。

## Implementation

- [x] 1.1 统一八项内置 Check 最小示例的真实 Run 与 consumer-owned 失败处理。
- [x] 1.2 补充 RunResult、output status 与 JSON Schema 安全关键 supporting declaration JSDoc。
- [x] 1.3 清除随包 Markdown 的仓库内部失效引用。
- [x] 1.4 复核最终 diff 未改变 root export inventory、runtime 行为或无关材料。
- [x] 1.5 补充 RunControls、CheckAggregation 与 caller-keyed cache 的字段级 JSDoc。
- [x] 1.6 补充 package Check 公开 final-data 字段的局部语义和计数关系。
- [x] 1.7 补充直接供自定义调度 policy、graph 模拟与 terminal Hook 消费的公开 DTO 字段 JSDoc。
- [x] 1.8 复核第二轮 diff 仍未改变 root exports、manifest、字段 shape 或 runtime 行为。

## Verification

- [x] 2.1 运行文档投影与 package material 的最窄检查。
- [x] 2.2 运行受影响的类型、lint、dependency 与 installed-candidate 验收。
- [x] 2.3 按跨文档、示例和 package 边界要求运行 `bun run check` 并审阅最终 candidate。
- [x] 2.4 对第二轮 JSDoc 运行格式、文档投影、类型检查及局部 declaration/QuickInfo 验收。
- [x] 2.5 重建 exact candidate，并运行包含外部 consumer types、documentation 与 runtime 的完整 Gate。
