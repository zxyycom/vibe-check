本 change 的核心目标是把现有 TypeScript quality tooling 提升为 Vibe Check 的自包含产品核心，并以 Bun 控制面、内建混合 scanner 和便携目录形成正式产品架构；本文只在本 change 下形成待审计临时计划，不影响现有其它文档或主规范。

## Context

Vibe Check 当前同时存在两条能力来源：Rust CLI 已实现 scan scope、LOC、结构扫描、duplicate、warning、gate 和 JSON output；开发期 TypeScript quality tooling 已实现更接近目标产品的扫描编排、code area、baseline/cache、scc/Lizard/jscpd adapter、warning 和 artifact report。前期为 Docnav 与 Vibe Check 复用脚本而建立的多个 submodule，会让产品源码所有权、checkout、版本推进和 release dependency 保持跨仓耦合。

当前方向不是把 Rust 产品迁移到 TypeScript，也不是长期维护双实现；现有 TS tooling 本身就是产品原型。Rust 代码只在某项 scanner backend 的独立实验能降低分发或维护成本时被选择性复用。

已确认的产品约束是：不要求单文件分发，接受解压即用的便携目录；产品不得依赖目标机器预装 Node、Bun、Python 或全局 scanner；`installRoot` 与被扫描项目必须相互独立；scanner 可以使用 JS、native process、Python 或 WASM，但产品控制面和业务 owner 保持 TS/Bun。

## Goals / Non-Goals

**Goals:**

- 将现有 TS quality tooling 确立为唯一产品核心和业务实现 owner。
- 建立 TS/Bun 模块化单体以及 product core、scanner backend、artifact projection 和 release packaging 的稳定边界。
- 把当前跨仓 toolkit 源码转为 Vibe Check-owned source，停止 Docnav / Vibe Check 代码同步和 submodule 治理。
- 建立不绑定实现语言的内建 scanner backend 模型和版本化 semantic profile。
- 以 Lizard + bundled Python 作为第一版 function-metrics backend，并用 Rust sidecar spike 评估未来替换价值。
- 形成 Windows x64 自包含便携目录的纵向验证路径，为后续平台包复用同一架构。

**Non-Goals:**

- 不从 Rust CLI 向 TS 逐项迁移，也不要求新产品与 Rust report schema、CLI parser 或内部模型兼容。
- 不在本 change 中完成全部配置字段、CLI option、warning threshold、artifact schema 或退出码设计。
- 不建立公开 scanner plugin SDK、第三方 backend discovery 或运行时 PATH fallback。
- 不统一 Docnav 与 Vibe Check 的脚本、配置或 release revision。
- 不预先把所有 scanner 重写为 TypeScript、Rust 或 WASM。

## Decisions

### Decision 1: 现有 TS quality tooling 成为产品核心

`quality-core` 已有 pipeline、baseline、cache、warning 和 report 能力，直接提升为 Vibe Check product core。正式 CLI、开发期 dogfooding 入口和 CI automation 均消费这一核心；产品运行路径不得反向依赖只服务仓库维护的 validators、workspace verifier 或 release scripts。

备选“以 Rust CLI 为产品、TS 只做外层 orchestration”会保留两套业务 owner；备选“从零设计新的 TS core”会放弃现有成熟实现，均不采用。

### Decision 2: 采用单仓自包含的模块化单体

Vibe Check 仓库拥有正式 CLI、product core、backend adapters、配置与报告模型以及 release assembly。现有 `quality-core` 和运行期实际使用的 foundation / parallel runner 能力按 pinned revision 一次性迁入并记录来源与许可证；迁入完成后移除 gitlink 和跨仓源码 import，不保留自动同步关系。

源码是否立即拆成多个 workspace package 不是架构要求；只有出现独立发布或明确依赖隔离价值时才增加 package boundary。

### Decision 3: TS/Bun 拥有完整控制面

TS/Bun 负责 CLI / invocation、scan scope、scan planning、baseline、cache、metrics aggregation、warning、gate、diagnostics 和 report/artifact projection。Scanner backend 只负责特定测量能力与结果归一化，不拥有产品 policy 或输出 contract。

开发依赖管理仍可暂时使用现有 pnpm lockfile；产品 runtime 和 release package 不依赖用户机器上的 package manager。

### Decision 4: Scanner 使用内建、语言无关的 adapter boundary

每个 backend 通过 Vibe Check-owned adapter 暴露 capability、input、normalized result、diagnostic 和 semantic profile。实现可以是同进程 JS、bundled native process、bundled Python tool 或 WASM；实现技术不得泄漏到 product core、warning policy 或稳定 artifact model。

第一阶段只支持产品内建 backend registry，不设计第三方 plugin API。Backend 不能通过 PATH、目标仓 `node_modules` 或隐式全局环境静默替换。

### Decision 5: Function metrics 首版使用 Lizard + bundled Python

第一版 function-metrics capability 使用固定 Lizard 与随包 Python runtime，保留现有四语言 NLOC、圈复杂度和参数数量能力。产品包把 Python 和 Lizard 视为受管理 backend，而不是外部前置条件。

并行 Rust `function-metrics` sidecar 只验证同一 normalized contract 下的行为、性能、产物大小和跨平台成本。它不是第二产品实现，也不阻塞 TS/Bun 主架构；只有测量证据证明收益后，才通过后续 change 替换生产 backend。

### Decision 6: 以平台便携目录作为 release unit

每个平台 release 包含 Vibe Check 控制面、内建 backend、schema、manifest 和第三方许可证材料，并在无全局 runtime / scanner、无网络的 clean machine 上运行。第一条纵向验证路径是 Windows x64；其它平台复用相同目录和 manifest contract。

Bun 官方支持把 TypeScript、导入文件、npm packages 和 Bun runtime 编入 standalone executable，并支持 Windows x64 cross-compile：https://bun.sh/docs/bundler/executables 。因此 release 可以在 spike 中比较 compiled control-plane executable 与独立 Bun runtime + JS bundle；无论选择哪种形式，native/Python backend 仍使完整产品以目录为交付单位。

### Decision 7: Semantic profile 标识 backend 行为而非只标识版本

每个可比较的 scanner capability 都必须有稳定 semantic profile identity，覆盖 backend identity/version、对结果有影响的固定选项和 normalization rules。Cache、baseline 和结果 metadata 必须能够区分不兼容 profile；不同实现只有在 profile 明确相同且 fixtures 证明等价时才能透明替换。

## Risks / Trade-offs

- [Risk] 一次性迁入多个 toolkit 后可能携带只服务 Docnav 或开发脚本的冗余抽象。→ 先固定来源 revision 和 characterization，再以产品调用链为边界逐步删减；不在迁入阶段同时重写行为。
- [Risk] Bun 与 Node-compatible npm package 在 compiled executable 中可能存在动态资源、子进程入口或模块解析差异。→ 便携 spike 同时验证源码运行、bundle 和 compiled mode，失败时保留独立 Bun runtime + bundle 作为同架构 fallback。
- [Risk] Bundled Python 显著增加体积、启动链路和平台 release 成本。→ 把 Lizard backend 独立放置并记录预算；Rust sidecar spike 只以测量结果驱动替换。
- [Risk] 现有主 specs 与 TS tooling 行为存在语义冲突。→ 本 change 先重建 owner 和 backend boundary；具体指标、CLI 与 output 冲突必须在实现前审计中列出并由对应 delta 或后续 change 明确解决。
- [Risk] 过早开放 plugin API 会固化尚未稳定的 adapter contract。→ 第一版只允许内部 registry；稳定多个内建 backend 后再评估公开扩展面。
- [Trade-off] 模块化单体减少独立发布和复用能力。→ 当前只有一个产品 owner，单仓内部边界已足以支持替换 backend，避免为假设中的消费者支付治理成本。

## Migration Plan

1. 完成实现前架构审计，确认本 change 的 capability、spec delta、开放问题和验证路径一致；审计解除前不实施代码迁入。
2. 固定现有 TS toolkit revisions、许可证、测试与产品实际调用面，建立迁入前 characterization baseline。
3. 将 `quality-core` 和运行期必要 helper 迁入 Vibe Check-owned product modules，保持行为不变并切断 submodule imports。
4. 建立正式 TS/Bun CLI / product core 调用链和内建 backend registry；开发脚本改为调用产品入口。
5. 组装 Lizard + Python、scc、jscpd 与 control plane 的 Windows x64 portable spike，在 clean/offline 环境验证。
6. 并行运行 Rust function-metrics sidecar spike，记录但不自动替换生产 backend。
7. 根据验证结果同步 architecture、script tooling、scanner、metrics、testing、release owner docs 和主 specs，再决定 Rust CLI 源码的历史保留或删除方式。

在正式 release contract 切换前，如果 spike 失败，可以恢复原开发脚本入口并保留既有 Rust binary；由于本 change 不做持久数据迁移，rollback 不需要数据转换。产品 owner 文档和 release 入口一旦切换，回滚必须同时恢复这些 owner，不能留下双重权威。

## Open Questions

1. 第一版 `FunctionMetric` 的 parameter count、NLOC 和圈复杂度正式采用 Lizard 原生语义，还是由 adapter 归一化到现有 Rust 语义？该答案必须在实现 function-metrics contract 前写入 Decision 和对应 spec。
2. Production control plane 最终使用 `bun build --compile`，还是携带独立 Bun runtime + bundled JS？由 Windows x64 spike 的兼容性、调试性、冷启动和体积证据决定。
3. 不同 semantic profile 是否必须使用完全独立的 baseline、threshold 和 accepted-warning namespaces，还是只隔离 cache/result identity？
4. Python runtime 与 Rust sidecar 的首版体积、冷启动、峰值内存和扫描延迟预算是多少？预算需要在 portable spike 前确定。

以上问题仍未回答；当前 change 只能进入实现前审计，不能开始实现任务。
