# Proposal

本 Change 在现有指南中补齐可执行的命名条件与普通 helper 示例，指导用户复用现有 flag DSL。

## Why

项目已支持命名条件、共享声明对象和 helper。当前用户指南主要展示内联条件，缺少集中定义语义并跨 Check 复用的指导。
在现有章节补齐这条使用路径即可改善可发现性，沿用现有 API 与运行行为。

## Outcome

用户仅凭随包 Check authoring 指南，就能选择预定义常量或参数化 helper，在多个 Check 中复用条件，
并区分源码条件名称与 `project.flags` 中的 token。

该文档改进独立于[派生 flag 评估](../evaluate-declarative-derived-flags/proposal.md)，按本轮授权单独实施与验证。

## Scope

### Intended Change

- 在现有 Check authoring 指南增加“命名与复用条件”及 helper 小节，沿用当前 grammar 与 selection owner。
- 使用 `docs/examples/package-api/reusable-flag-conditions.ts` 的受管 regions 维护主示例与 helper，接入现有 runtime / typecheck acceptance。
- 说明条件变量与 token 字符串的区别、完整 enablement 共享和依赖传播的适用边界，不增加 public API 或 token registry。

### Resulting Impacts

- 同步示例 registry、指南投影与当前协调视图；既有 README、发布映射及产品实现不变。
- 公开片段须支持用户选择常量或 helper；执行证据须验证跨 Check 复用、helper 组合与变量名不自动生成 token。
- 本轮另两项已授权的 waiver 结果示例和 JSON Schema 前提补充各自保持局部，不并入本 Change 的 Outcome；共享投影与包验收串行执行。

## Success Criteria

1. 用户仅凭随包指南能在两个 Check 中复用条件，并选择固定常量或参数化 helper。
2. 用户能区分 `when: ciOrManual` 与 `when: "ciOrManual"`，理解 helper 名称和变量名不会自动进入 `project.flags`。
3. 既有条件 grammar、propagation、protected change token 与 Definition snapshot 语义保持不变。
4. 示例投影、运行、类型和受影响包材料验证通过，并有非实施代理的限定范围用户阅读复核。

## Affected Owners

- [Check authoring](../../docs/guides/extending-check-lifecycle.md)：公开使用路径与完整条件契约。
- [Documentation](../../docs/tooling/documentation.md)与示例 registry：受管源、投影和 installed consumer 验收。
- [Project Definition](../../docs/development/project-definition.md#flag-enabled-checks)、[Project Run](../../docs/development/project-run.md#change-preparation-and-flag-projection)：只读核对现有语义，不修改实现。
- [Change 协调](../../docs/governance/change-coordination.md)：当前允许工作与共享写入边界。
