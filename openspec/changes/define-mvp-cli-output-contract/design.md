本 design 说明如何把 MVP CLI 与输出契约整理成可审计实现计划，并让长期规则回到 `docs/` owner 文档。

## Context

Vibe Check 目前已有长期架构和编码规范文档，定义了组件 owner、scanner 边界、输出分层和验证期望。`docs/navigation.md` 已把 CLI 与 Output 视为主规范入口，但仓库还没有对应 owner 文件、Rust crate、CLI 实现、机器输出 schema、examples 或 OpenSpec 主 specs。

当前最大的实现风险是：第一段可执行代码可能在契约 owner 缺失时直接写死 CLI 行为、退出码、JSON 字段或输出通道。本 change 先建立后续实现和测试可以遵守的契约。

## Goals / Non-Goals

**Goals:**

- 定义 MVP scan 命令 surface，以及 CLI 传给 core 前的归一化 request 边界。
- 定义成功、gate failure、用户/config failure、scanner fatal failure 和 output failure 的稳定退出码分类。
- 定义 stdout/stderr 归属规则，保证人读输出和机器输出都能被自动化消费。
- 定义 MVP JSON envelope 和 human output section。
- 确定 CLI 与 Output 长期 owner 文档落点，并让导航文档指向这些 owner。
- 定义后续实现中 schema、examples 和测试如何证明输出契约。
- 让第一段可执行实现足够小，可以先于完整 scanner 集成完成。

**Non-Goals:**

- 不在本 change 中实现 scanner adapter、质量指标、warning policy、gate policy 或配置发现。
- 不一次性定义所有未来 CLI 命令或所有配置项。
- 不在 MVP 中新增独立 CI 输出模式；CI 集成默认消费 `json` 输出，未来 CI summary 或 annotation 只是同一 report data 的展示投影。
- 不把 scanner 原始输出变成稳定 public contract。
- 不在本 change 的计划创建阶段修改当前长期文档、主 specs、schema 或 examples。

## Decisions

### Decision 1: 拆分 CLI 与输出 capability

本 change 创建 `cli-contract` 和 `output-contract`，而不是一个总括 capability。CLI 参数、路径/config 归一化、stdout/stderr 和退出码的变化原因，与 JSON envelope、human output section、schema examples 和格式校验边界不同。

备选方案是创建单个 `mvp-contract` capability。这样现在更省事，但后续归档和 owner 边界会更模糊。

### Decision 2: 使用 `vibe-check scan [project-root]` 作为 MVP 入口

MVP CLI 使用显式 `scan` 命令和可选 project root。这样保留未来命令族扩展空间，同时让第一段可执行路径清晰可测。只有在显式命令已经被测试证明后，才考虑增加简写调用。

备选方案是默认 `vibe-check [project-root]` 且无子命令。这个形式对用户方便，但 bootstrap 阶段会让命令类型识别、help 和错误测试不够明确。

### Decision 3: JSON 是稳定自动化 surface

`json` 输出使用固定 JSON envelope，包含 schema version、工具元数据、归一化 scope、metrics、warnings、gate result 和 diagnostics。`human` 输出可以优化阅读体验，但必须从同一份 report data 投影，不能引入独立业务语义。

备选方案是从人读输出或 scanner raw summary 派生 JSON。这样会让自动化依赖排版选择或 adapter 私有细节。

CI 在本 change 中只是 `json` 输出的消费场景和未来展示层边界：CI 默认消费 `json`；未来存在 CI summary 或 annotation 时，必须从同一 report data 投影；本 change 不定义 `--format ci` 或其它独立 CI mode。

### Decision 4: 退出码 `1` 保留给质量 gate failure

CLI 需要区分“扫描完成但质量 gate 失败”和“输入无效、配置错误、scanner fatal、输出失败”。这让 CI 用户可以判断是质量不达标，还是工具没有正确运行。

备选方案是所有失败都返回 `1`。这对小 CLI 常见，但会丢失 Vibe Check 架构文档已经定义的错误分类边界。

### Decision 5: 用契约 fixture 启动第一段实现

第一段实现可以使用最小内置 scanner result 或 fixture-backed core outcome，在真实 adapter 接入前先证明 CLI/output 行为。Scanner 依赖仍由 `docs/scanner-dependencies.md` 维护；本 change 只要求有足够归一化数据来测试输出和退出码。

备选方案是先实现真实 scanner stack。这样会推迟 public contract 验证，并把 adapter 风险混入 CLI/output 决策。

### Decision 6: 长期规则归位到 docs owner

OpenSpec delta 用于规划和审计本 change；apply 后长期规则仍应落到 `docs/` 下的 CLI 与 Output owner 文档，并由 `docs/navigation.md` 作为入口。Schema、examples 和测试证明契约，但不替代 owner 文档解释规则。

备选方案是只依赖归档后的 OpenSpec 主 spec。这样能减少文档数量，但会偏离当前项目“`docs/` 是长期规范入口”的约定。

## Risks / Trade-offs

- 先写契约会比直接写二进制慢一些。缓解方式：MVP 契约保持小范围，并让每条 requirement 对应具体测试或示例。
- 显式 `scan` 子命令不如默认调用方便。缓解方式：只有在不破坏同一归一化 request 和测试的前提下，后续再加简写。
- 真实 scanner adapter 接入后，JSON envelope 可能需要扩展。缓解方式：保留 `schema_version` 作为当前格式标识；后续 shape change 同步更新 Output owner、schema、examples 和测试，并避免暴露第三方 scanner-native 结构。
- 退出码分类可能在实现前过度设计。缓解方式：只保留五类顶层结果，并测试可观察映射而非内部错误类型。

## Migration Plan

这是 bootstrap change。后续 apply 时应创建初始 Rust workspace、必要的 CLI 契约 owner 材料、schema/example fixture 和聚焦测试。当前没有已发布可执行文件，因此没有运行时迁移或回滚要求。

## Open Questions

无未回答开放问题，可以进入实现前审计。
