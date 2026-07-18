本 change 在长期文档调整后执行两个独立代码任务：完整删除 Rust 产品路径；将现有 TypeScript/Bun 质量脚本按原有行为迁移到 `src/product/**`。Rust 只属于删除任务，TypeScript/Bun 实现是迁移任务的唯一来源和行为基准。

## Context

当前仓库有两条不对等的实现路径：

- `scripts/quality/scan.ts` 调用 pinned `scripts/tools/quality-core`，已经稳定提供 quick、full、baseline、warning 和 artifact 能力，却仍被定义为开发期工具。
- `crates/vibe-check/**` 是现有 Rust 产品实现，但继续演进 Rust 已不再是本阶段目标。

源码归位与产品能力重做需要独立验证。本设计把首次产品化限制为两个代码任务：删除 Rust 产品；迁移现有 TypeScript 运行时闭包、建立正式入口并证明 TypeScript 行为保持。两者之间不存在 Rust-to-TypeScript 移植关系。

## Goals / Non-Goals

**Goals:**

- 完整删除 Rust 产品源码、测试、fixtures、构建配置和执行接线，不保留待迁移 Rust 资产。
- 将固定版本的 TypeScript 扫描实现、测试、fixtures 及必要运行时 helper 纳入 `src/product/**` 的仓库所有权。
- 建立 `bun run product:cli -- scan [project-root]`，并让仓库 dogfood 命令单向消费该入口。
- 先调整长期文档，再依次执行 Rust 删除和 TypeScript 迁移。
- 保持上移前 TypeScript 脚本已有的 profile、参数、scanner 栈、baseline、warning、状态、退出结果和 artifact 语义。
- 为后续小 change 提供一个可工作、可测试的 TypeScript 产品起点。

**Non-Goals:**

- 不重写 scanner，不把 Lizard 改写为 TypeScript，也不改变 scc、Python/Lizard、jscpd 的固定检测栈。
- 不在迁移中引入新的配置系统、状态目录模型、报告 schema、输出模式或 gate policy。
- 不把现有质量核心拆成新的领域层、adapter 层或服务层。
- 不顺带修复已知解析、baseline、cache、changed-file 或 comparison 缺陷；这些问题分别进入后续 change。
- 不把 `parallel-task-runner` 或 CI annotation consumer 纳入产品 runtime。
- 不迁移、改写、复用或逐项对照 Rust 产品源码、测试、fixtures、模块结构或行为。

## Artifact Owners

- proposal 只拥有动机、范围和受影响 capabilities。
- 本 design 拥有执行顺序、允许调整范围和技术决策。
- delta specs 只定义 change 完成后的稳定产品 contract；TypeScript 上移前后对照规则不进入长期 spec。
- tasks 拥有执行动作、阶段门禁和验收命令。

## Decisions

### Decision 1: Rust 只删除，不迁移

首个代码任务 SHALL 完整删除 `crates/vibe-check/**`，包括 Rust 源码、测试和 fixtures，并删除根 Cargo 产品 workspace、Rust toolchain 配置、专用构建 helper 及命令接线。任何 Rust 源码、测试、fixture、模块结构或运行行为都不得作为新产品的迁移输入、兼容层、行为基准或逐项移植清单。

选择这一方案，是为了让 Git 历史明确表达产品方向已经切换，并避免继续用 Rust 结构约束成熟脚本。保留 Rust 与 TypeScript 双实现直到新产品入口就绪的方案会继续制造双 owner，因此不采用。

### Decision 2: 只有固定 TypeScript 快照是迁移来源

TypeScript 迁移 SHALL 只以 `scripts/tools/quality-core` gitlink 固定的 `3acea8c2f643ea86f7a1e8f2a6db716b7e320c76` 为质量核心来源，以 `scripts/tools/foundation` gitlink 固定的 `f593edbf55fd03be7db54ef44a38d0a9feda4dbd` 为 helper 来源，并以 consumer revision `eae25aee64a5b4ecef4b02e8e86d8d39c4ab122d` 中 `scripts/quality/scan.ts`、`args.ts` 和 `config.ts` 为 consumer 来源。源码先保持原有文件分组、类型和控制流，仅做路径、入口和仓库所有权所必需的机械调整。

选择 lift-and-shift 而不是重新设计，是为了让迁移差异可以按来源文件复核。超出机械调整范围的改动进入后续独立 change。

### Decision 3: 产品 runtime 闭包全部归仓库所有

`src/product/**` SHALL 包含执行扫描所需的质量核心、入口代码和 `foundation` helper 闭包，且不得在运行时导入 `scripts/**` 或任何 toolkit gitlink。`foundation` 中只复制产品路径实际可达的 helper；仍服务开发脚本的 submodule 可以保留为开发依赖。

选择复制最小运行时闭包，是为了满足产品源码可独立维护，同时避免把与扫描无关的共享 toolkit 一并产品化。来源 commit 和复制范围记录在 `src/product/README.md`。

### Decision 4: TypeScript 迁移以行为保持为准

上移前的 TypeScript 脚本输出是本次 change 的唯一行为基准；Rust 产品行为不参与对照。实现只允许改变源码位置、导入路径、正式命令名和为接受 project root 所需的最薄入口接线；现有 flag 含义、默认 profile 行为、扫描器调用、指标、warning、baseline、artifact 文件和状态映射保持不变。

本 design、proposal 与 tasks 所称配置、输出、gate、schema/examples 和质量规则“保持不变”，均指上述 pinned TypeScript consumer、quality-core 与 foundation 的现有 observable behavior。它不保留 Rust `vibe-check scan`、human/JSON stdout、`vibe-check.report.v1`、0–4 blocking-gate mapping、Rust metrics/warnings 或四语言 scope contract；这些要求由本 change 的 delta specs 明确移除或替换。

验收覆盖 quick、full、baseline 和显式 changed-files。对照只忽略由源码位置、命令入口、时间戳、绝对路径或工具环境元数据造成的非语义差异；其它差异阻塞 TypeScript 迁移。借上移修复既有缺陷的方案不采用。

### Decision 5: 正式入口唯一，兼容方向单向

正式本地入口 SHALL 是 `bun run product:cli -- scan [project-root]`。省略 project root 时使用启动 cwd；仓库现有 `quality:*` 命令和保留的 `scripts/quality/scan.ts` SHALL 显式传入仓库根并直接委托产品入口，以维持 dogfood 工作流；产品源码不得反向导入这些 wrapper。

选择薄 wrapper 是为了保留成熟的仓库调用方式，同时避免维持第二套核心。立即删除所有旧命令会增加无关迁移成本，保留两套实现则会重新制造双 owner。

### Decision 6: 文档先于两个代码任务

代码任务开始前 SHALL 先更新长期文档与 AGENTS，分别写明 Rust 产品删除、TypeScript 产品 owner 和 dogfood consumer。文档 SHALL 区分目标契约与当前实现状态；只有两个代码任务和验收完成后，才把 `src/product/**` 标记为已实现的唯一产品路径。

文档与 spec delta SHALL 把 contract 变化拆开表达：退役 Rust CLI、human/JSON output、blocking gate、schema/example ownership、metrics、scan scope、scanner 与 fixture requirements；独立记录现有 TypeScript/Bun 脚本使用的 CLI、artifact、metrics owner、collection、jscpd 与 Python/Lizard boundary。现有 TypeScript 测试资产随源码上移，不在本 change 中补建缺失 coverage。配置、输出、scanner algorithm、gate、schema/examples 和质量规则仅保持 pinned TypeScript behavior，不保留任何 Rust contract。

## Risks / Trade-offs

- [复制旧代码会保留已有缺陷] → 用 characterization 和 parity 证明本次只移动；缺陷按独立 change 修复。
- [文档先于代码会形成短暂状态差] → 文档明确标注目标与当前状态，并在两个代码任务验收后完成状态收口。
- [删除 Rust 后短时间内没有可用产品入口] → 把删除和上移拆成相邻、可审查的实现切片，不在中间状态发布。
- [最小 foundation 闭包遗漏动态依赖] → 用静态 import 检查、typecheck、测试和 quick/full 实际执行共同验证。
- [新旧 artifact 含有非语义差异] → 对照脚本忽略时间戳、绝对根路径和明确记录的工具环境字段，其余差异视为阻塞。
- [后续重构再次与功能修改混合] → 首次产品化完成后，以独立 OpenSpec change 分别处理配置、CLI、输出、scanner 和已知缺陷。

## Execution Plan

1. 更新长期文档与 AGENTS，分别定义 Rust 删除、TypeScript 产品 owner、入口方向和实现状态，并完成文档验证。
2. 完整删除 Rust 产品代码、测试、fixtures、Cargo 产品接线和 Rust 专用验证；不迁出或保留任何 Rust 资产。
3. 固定 TypeScript 来源 revision，只将 quality-core、扫描入口、参数、默认配置、必要 foundation helper 及其 TypeScript 测试和 fixtures 原样迁移到 `src/product/**`，并移除 quality-core gitlink。
4. 增加最薄的 `product:cli` scan 分流和 project-root 传递；把 `quality:*` 及 `scripts/quality/scan.ts` 改为单向 wrapper。
5. 运行 import boundary、typecheck、lint、测试以及上移前 TypeScript 脚本与新产品入口的 quick、full、baseline 和显式 changed-files 对照；只处理由移动造成的回归。
6. 更新被迁移 TypeScript 测试的 case 路径和文档实现状态，运行 dogfood、workspace 与最终文档验证。

Rust 删除和 TypeScript 迁移 SHALL 分别形成可独立审查、可独立 revert 的代码任务；任何回滚结果都不得把 Rust 资产混入 TypeScript 产品源码。

## Open Questions

无。
