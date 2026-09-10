# Design

本设计把“插件”收敛为显式导入、可参数化的配置工厂，并以字段感知的 composer 在默认化前形成一个 Project Definition input；Gate contribution 保持为可选的项目层输出。

## Context

- [`docs/development/project-definition.md`](../../docs/development/project-definition.md) 规定 `defineConfig` 生成普通 `ProjectDefinition`，package-provided constructors 生成 ordinary Checks，Product 不发现或重载配置模块。
- `defineConfig` 会补齐 `apiVersion`、outputs、static admission policy、`maxParallel`、空 `measurementHooks` 和空 resource capacities。配置组合必须发生在这些默认值产生之前。
- `checks` 与 `measurementHooks` 是有序 collection，`admissionPolicy` 是单一策略，resource capacities 是全局 mapping，output fields 还有 Definition default 与 invocation override 的既有边界；composer 需要按字段语义工作。
- [`provide-learned-admission-through-public-strategy.md`](../../docs/decisions/provide-learned-admission-through-public-strategy.md) 已证明显式 import factory 可以通过普通公共 contract 启用可选功能。
- [`centralize-project-gate-after-hook-configuration.md`](../../docs/decisions/centralize-project-gate-after-hook-configuration.md) 规定 adapter 从中央配置取得唯一 `afterGate`。若功能配置参与 Gate 后处理，项目层 composer 仍需输出一个 `afterGate`，并为新的内部组合方式建立后继判断。
- [`clarify-project-extension-lifecycle`](../clarify-project-extension-lifecycle/) 是设计前置，负责确定可组合、独占和 root-owned 的扩展槽位及合法依赖表达。

## Goals / Non-Goals

### Goals

1. 让功能配置工厂接收闭合 options，并返回带来源身份的 authored contribution；presence 表示启用，省略表示零行为。
2. 在 `defineConfig` 默认化之前组合 fragments，保留最终 Definition 为 Product 的唯一运行输入。
3. 为每个贡献字段定义合并规则、冲突诊断和来源追踪。
4. 支持单功能配置与组合套装，同时沿用 ordinary Check、scheduler、output 和 Gate contracts。
5. 以质量检查、智能调度和文档检查作为首批真实消费者，并验证 package-root 使用方式。

### Non-Goals

- 配置包是显式 TypeScript authoring，不承担动态发现、安装状态、热重载、文件生成或后台生命周期。
- composer 只组合现有普通 contracts，不为内置配置包提供 Core 特权，也不新增生命周期阶段。
- Product Definition 与 Gate projection 保持分层；配置顺序不静默覆盖独占字段。

## Decisions

### Intended Change

以下是进入 Plan 前需由生命周期分类和首批消费者验证的暂定方向，不表示公共 API 已经采用：

1. 功能包是同步 TypeScript 配置工厂；它验证自己的 options 并返回不可变 contribution。composer 汇总 authored fragments，检查冲突，再调用一次 `defineConfig`。
2. 初始合并规则按字段分类：

   | 字段类别 | 暂定规则 |
   | --- | --- |
   | `checks`、同槽位 observer Hooks | 按 contribution 顺序连接 |
   | `admissionPolicy`、最终 Gate result policy | 最多一个 provider |
   | resource mapping | 按 key 合并；同 key 不一致时报错 |
   | outputs 与 root scalars | 保持 root-owned，或在 Plan 中证明更窄规则 |

3. 配置工厂 options 是功能自定义入口；套装组合普通 contributions，并保留每个来源身份、冲突和权限要求。
4. composer diagnostics 指向 contribution ID 与冲突字段。最终 Definition 继续由现有 validation/normalization 关闭 grammar；plugin ID 不自动进入 declarative fingerprint。
5. 项目层可以把 Product contribution 与 Gate contribution 分别投影为一个 Definition input 和一个 `afterGate`。Gate 内部优先区分可累加 observer 与唯一 result policy。
6. 三个首批功能族分别证明启用/省略、自定义 options、base-config 合并、冲突失败、零隐藏 I/O 和 installed-consumer 路径。

### Resulting Impacts

- Public authoring 可能新增 contribution/composer 类型和配置工厂，需要同步 package exports、declarations、JSDoc、README、API mechanics、示例、changelog 与 installed-consumer acceptance。
- Definition 默认化、validation、normalization、freezing、warnings 和 fingerprint 继续由现有 Definition owner 承接；composer 不能成为第二 parser。
- 每个功能包引入的 Check options、resources、strategy I/O 和 Hook failures 继续由 producing owner 承接。
- Gate contribution 需要同步长期决策、Project Gate owner、bound-module contract、failure containment 与 exact-candidate tests。
- 配置合并与三个首批功能包需要语义 Cases；测试改动遵循 Test Evidence，行为和职责 diff 另由非实施代理审查文档影响。

## Risks / Trade-offs

- “插件”可能被理解为 runtime discovery；公开名称和示例需要首先说明它是显式配置工厂。
- 冲突规则过严会降低组合价值，过松会让顺序隐式改变全局策略；首批消费者必须验证每类字段。
- Product 与 Gate 的联合便利性不能模糊 package/adapter 边界；统一入口需要保留分层输出。
- contribution identity、套装去重和 machine audit 需要共同设计，避免把接线身份误作声明行为。

## Open Questions

| Topic | 进入 Plan 前需固定的选择 |
| --- | --- |
| Public syntax | `composeProjectConfigs([...])` 后调用 `defineConfig`，还是由新的 `defineProject(...)` 一次返回 Definition 与 Gate projection。 |
| Naming | 对外称 plugin、feature config、config package 或 preset；名称是否准确排除 runtime discovery 预期。 |
| Fragment grammar | 是否导出精确 `ProjectDefinitionFragment`，如何拒绝 unknown keys，以及 source ID 是 fragment metadata 还是 composer 参数。 |
| Scalar ownership | `maxParallel`、outputs 和 capacities 由 root 独占、允许相同值合并，还是需要显式 defaults/requirements 两层语义。 |
| Gate composition | observer 的返回与失败模型、唯一 result policy 的职责，以及现有 performance observer 如何迁移而不改变 status。 |
| Audit identity | enabled contribution IDs 是否进入 diagnostic/machine output，以及如何保持 declarative fingerprint 只表达最终行为配置。 |
| First packages | 质量、智能调度与文档配置各自精确包含哪些 Checks、Hooks、策略、默认值和可定制 options。 |
