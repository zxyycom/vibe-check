# Design

本次优化把文档与代码视为两条相互校验但 owner 不混淆的消费链：consumer 通过手写 Check 指南恢复 public contract，Product 实现通过具名边界与领域类型兑现同一 contract。

## Context

目标 AI 是为 package consumer 生成或审查 `fileMetrics(options?)` 配置的编码代理。它实际从 root README 进入 `docs/checks/file-metrics.md`，并可读取 package declarations；内部维护任务再按导航读取 Configuration、scanner dependencies 与源码。

预期操作是选择 area ID，为每个 area 声明 files/codeLines，判断 defaults 与 invalid input，并解释重叠语义、SCC executable boundary 和 terminal results。可观察结果是 AI 不需要从多个 owner 拼接同一规则即可生成合法配置，并能明确判断无输入、scanner failure、invalid result 和超限 finding。

## Goals / Non-Goals

**Goals**

- 让手写 Check guide 完整承接 consumer options、默认值、有效 maximum 算法、重叠 area、Record/result 与 custom executable 使用边界。
- 让源码文件名、跨阶段类型和局部名称直接表达 constructor、exact inputs、scanner、area membership、Record conversion 与 failure mapping。
- 保持现有 public option、SCC protocol、Records 与 terminal outcomes 不变。

**Non-Goals**

- 不重新设计 file-metrics policy、阈值或 SCC 版本契约。
- 不以相邻 duplicate/function metrics 实现作为编码规范例外，也不顺带重构这些 owner。
- 不修改 generated README 作为内容 owner；需要 projection 时从现有 template/guide 入口生成。
- 不归档本 Change，除非用户另行授权。

## Decisions

### Intended Change

1. `docs/checks/file-metrics.md` 完整拥有 consumer contract；`docs/configuration.md` 只拥有 package composition 共性和 inventory 摘要，`docs/scanner-dependencies.md` 继续拥有 private adapter 与 exact-input handoff。
2. 将 `default-check.ts` / `default-check.test.ts` 改为 `constructor.ts` / `constructor.test.ts`，使目录与文件名共同表达当前职责；同步 package root export 和 Case entity keys。
3. public authored options 与 private resolved options 保持分离；runtime validator 接收 `unknown`，constructor resolution 仍是唯一 default materialization boundary。
4. exact-input collection、scanner invocation、measurement acceptance、Record policy 与 terminal settlement 使用领域名称，不用弱名称代替跨步骤职责。
5. Record conversion 先解析路径对应的 area policy，再判断是否超限并构造 Record，不用 `null` 与 `undefined` 同时编码 no-finding 和 invalid-result。
6. 封闭的 measurement failure union 使用穷尽 `switch`；稳定 Record metric 使用 owner-local constant；SCC process error 复用 host-environment 的 typed process failure capability。

### Resulting Impacts

- Test rename 保留原 Case IDs 与证明内容，只更新 current entity path；目标测试继续证明 constructor defaults/validation、single SCC scan、overlap strictness 与 Record identity。
- package candidate 的 root export 保持 `fileMetrics` / `FileMetricsOptions`，只有 package-private source/declaration module path变化。
- Configuration 的 summary 和 Check guide 的完整 contract 通过显式链接保持可追溯，generated README 继续由现有 projection 生成。

## Risks / Trade-offs

- package 内会出现 private module path 变化；package 仍只公开 root export，且处于 prestable hard-cut 阶段，因此不保留旧内部路径 wrapper。
- Record conversion 的结构优化可能意外改变 no-finding 与 invalid-result 分界；保持同一目标测试并运行 direct callback evidence 控制该风险。
- 共享工作区仍有并行 Change；修改共享 owner 文档时只编辑 file-metrics 直接相关段落，验证失败需按实际 owner 隔离。

## Open Questions

无。用户已明确要求以 AI-ready docs 和完整编码规范复核当前变更，并要求不得以相邻临时代码作为偏离依据。
