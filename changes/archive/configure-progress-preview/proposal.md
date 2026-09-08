# Proposal

实现数量、文本长度与同步 formatter 可配置的 Product progress preview，保留默认输出和完整 Check facts。

## Why

实施前，Product progress 固定预览每个 settled Check 的前 5 条 Records、前 5 条 messages，并把每段预览文本限制为 240 个 Unicode code points。用户需要调整终端摘要的信息量并自定义文本呈现，而不是改写 Check 事实或另建输出系统。

2026-09-07 用户选择优先推进本 Change，并明确第一版包含 formatter；回调只需要默认文本、类型和长度限制，不需要 Record/message 原始结构。独立的 Finding 呈现审查不构成本 Change 的实施前置。

## Outcome

调用方可在 Definition 中保存 progress policy，并通过 RunControls 单次覆盖 Record/message 预览数量、每条文本上限及同步 formatter。省略新配置时保留既有 5／5／240 行为；任何配置或回调都不能改写完整事实、绕过 terminal escaping 或接管 Check settlement。

## Scope

### Intended Change

在既有 `outputs.progressRendering` 增加独立数量、code-point limit 与可空同步 formatter；沿用已有 output defaults、validation、normalization、RunControls override 和 renderer owner，不新建输出渠道或通用 hook 框架。

### Resulting Impacts

- 用后继 Decision 修订固定预览限制与 public option 禁止，保留原 Record/message、安全投影和输出责任。
- 区分 authored/resolved 与 callback-free declarative outputs；旧 direct Definition 输入继续合法，formatter 函数不进入 snapshot/fingerprint。
- 同步用户用法、内部配置与渲染 owner、公开类型/JSDoc、可执行示例和 installed-consumer evidence。
- 覆盖 formatter failure、误返 Promise、短文本预算、完整 facts、tee、disabled 和已有输出优先级；不改变 Finding helper、machine facts 或 RunResult 输出状态形状。

## Success Criteria

1. 默认无 formatter 的用户可观察输出与现状一致；旧 `defineConfig` 和 direct Definition 用法继续可用。
2. 两类数量与文本预算独立、校验明确，RunControls 覆盖和 formatter 显式清除可观察，配置不回写 caller 输入。
3. formatter 仅处理选中 preview 的默认文本，结果仍被转义与限制；失败只影响 progress output，不丢失已接受的完整 facts，也不产生因返回真实 Promise 导致的未处理 rejection。
4. declarative snapshot 不含 callback，默认/显式默认等价、不同 callback identity 不改变相同种类的 fingerprint，RunControls 不参与 fingerprint。
5. 用户和内部说明经非实施代理从实际 diff 反查，目标测试、Test Evidence、工程校验与完整 package/installed-consumer Gate 通过。

## Affected Owners

- `src/project-definition/**`、`src/project-run/controls/**`、`src/project-run/outputs/**`、`src/project-run/progress-rendering/**` 与 `src/index.ts`。
- [Project Definition](../../../docs/development/project-definition.md)、[Project Run](../../../docs/development/project-run.md)、[人读输出](../../../docs/development/human-output.md)、[API 机制](../../../docs/api-mechanics.md#check-messages-与受管-progress)、README 与必要 package API 示例。
- [测试策略](../../../docs/testing/strategy.md)、[Case 维护](../../../docs/testing/case-maintenance.md)、对应 Case 与 package declaration/consumer 验证。
