本 change 的目标是先移除 Rust 产品路径，再把成熟的 TypeScript 质量脚本按现有行为上移为仓库自有产品源码；本文仅形成待审计临时设计，不修改现有主规范或其它 change。

## Context

当前仓库有两条不对等的实现路径：

- `crates/vibe-check/**` 是现有 Rust 产品实现，但继续演进 Rust 已不再是本阶段目标。
- `scripts/quality/scan.ts` 调用 pinned `scripts/tools/quality-core`，已经稳定提供 quick、full、baseline、warning 和 artifact 能力，却仍被定义为开发期工具。

旧 change 尝试在迁移时同步重构 CLI、配置、状态、scanner、输出和测试体系，导致“源码归位”与“产品能力重做”无法独立验证。本设计把首次产品化实现限制为删除旧产品路径、复制既有 TypeScript 运行时闭包、建立正式入口和证明行为保持。

## Goals / Non-Goals

**Goals:**

- 让 Rust 删除成为第一个实现切片，并清除所有 Rust 产品构建和执行接线。
- 将固定版本的 TypeScript 扫描实现及必要运行时 helper 纳入 `src/product/**` 的仓库所有权。
- 建立 `bun run product:cli -- scan [project-root]`，并让仓库 dogfood 命令单向消费该入口。
- 保持迁移前已有的 profile、参数、scanner 栈、baseline、warning、状态、退出结果和 artifact 语义。
- 为后续小 change 提供一个可工作、可测试的 TypeScript 产品起点。

**Non-Goals:**

- 不重写 scanner，不把 Lizard 改写为 TypeScript，也不改变 scc、Python/Lizard、jscpd 的固定检测栈。
- 不在迁移中引入新的配置系统、状态目录模型、报告 schema、输出模式或 gate policy。
- 不把现有质量核心拆成新的领域层、adapter 层或服务层。
- 不顺带修复已知解析、baseline、cache、changed-file 或 comparison 缺陷；这些问题分别进入后续 change。
- 不把 `parallel-task-runner` 或 CI annotation consumer 纳入产品 runtime。

## Decisions

### Decision 1: 先删除 Rust 产品路径

首个实现切片 SHALL 删除 `crates/vibe-check/**`、根 Cargo 产品 workspace、Rust 产品测试、专用构建 helper 及命令接线。Rust 实现不作为新产品的迁移目标、兼容层或逐项移植清单。

选择这一方案，是为了让 Git 历史明确表达产品方向已经切换，并避免继续用 Rust 结构约束成熟脚本。保留 Rust 与 TypeScript 双实现直到迁移结束的方案会继续制造双 owner，因此不采用。

### Decision 2: 从固定快照直接上移

实现 SHALL 以 `scripts/tools/quality-core` gitlink 固定的 `3acea8c2f643ea86f7a1e8f2a6db716b7e320c76` 为质量核心来源，并以上移时当前仓库的 `scripts/quality/scan.ts`、`args.ts` 和 `config.ts` 为 consumer 来源。源码先保持原有文件分组、类型和控制流，仅做路径、入口和仓库所有权所必需的机械调整。

选择 lift-and-shift 而不是重新设计，是为了让迁移差异可以按来源文件复核。旧 change 中的模块化重写只作为实验分支参考，不 cherry-pick 到新实现。

### Decision 3: 产品 runtime 闭包全部归仓库所有

`src/product/**` SHALL 包含执行扫描所需的质量核心、入口代码和 `foundation` helper 闭包，且不得在运行时导入 `scripts/**` 或任何 toolkit gitlink。`foundation` 中只复制产品路径实际可达的 helper；仍服务开发脚本的 submodule 可以保留为开发依赖。

选择复制最小运行时闭包，是为了满足产品源码可独立维护，同时避免把与扫描无关的共享 toolkit 一并产品化。来源 commit 和复制范围记录在 `src/product/README.md`。

### Decision 4: 首次迁移以行为保持为准

迁移前的 TypeScript 脚本输出是本次 change 的行为基准。实现只允许改变源码位置、导入路径、正式命令名和为接受 project root 所需的最薄入口接线；现有 flag 含义、默认 profile 行为、扫描器调用、指标、warning、baseline、artifact 文件和状态映射保持不变。

选择语义对照而不是逐字节对照，因为时间戳、绝对路径和工具环境元数据可能合理变化；允许差异必须显式列出并证明不改变业务结果。借迁移修复既有缺陷的方案不采用。

### Decision 5: 正式入口唯一，兼容方向单向

正式本地入口 SHALL 是 `bun run product:cli -- scan [project-root]`。仓库现有 `quality:*` 命令和保留的 `scripts/quality/scan.ts` SHALL 直接委托产品入口，以维持 dogfood 工作流；产品源码不得反向导入这些 wrapper。

选择薄 wrapper 是为了保留成熟的仓库调用方式，同时避免维持第二套核心。立即删除所有旧命令会增加无关迁移成本，保留两套实现则会重新制造双 owner。

## Risks / Trade-offs

- [复制旧代码会保留已有缺陷] → 用 characterization 和 parity 证明本次只移动；缺陷按独立 change 修复。
- [删除 Rust 后短时间内没有可用产品入口] → 把删除和上移拆成相邻、可审查的实现切片，不在中间状态发布。
- [最小 foundation 闭包遗漏动态依赖] → 用静态 import 检查、typecheck、测试和 quick/full 实际执行共同验证。
- [新旧 artifact 含有非语义差异] → 对照脚本忽略时间戳、绝对根路径和明确记录的工具环境字段，其余差异视为阻塞。
- [后续重构再次与功能修改混合] → 首次迁移完成后，以独立 OpenSpec change 分别处理配置、CLI、输出、scanner 和已知缺陷。

## Migration Plan

1. 在改动实现前记录 pinned source、当前 `quality:*` 命令、运行时 import 闭包，并保存 quick、full、with-baseline 的可复现基准。
2. 作为第一个实现切片删除 Rust 产品代码、Cargo 产品接线、Rust 专用验证和失效文档入口；确认仓库不再存在 Rust 产品执行路径。
3. 将 pinned quality-core、扫描入口、参数、默认配置、必要 foundation helper、对应测试和 fixtures 原样上移到 `src/product/**`，记录来源并移除 quality-core gitlink。
4. 增加最薄的 `product:cli` scan 分流和 project-root 传递；把 `quality:*` 及 `scripts/quality/scan.ts` 改为单向 wrapper。
5. 运行 import boundary、typecheck、lint、测试以及 quick/full/baseline parity；只处理由移动造成的回归。
6. 同步 architecture、script-tooling、testing 和命令说明，使长期 owner 指向 TypeScript 产品源码。

回滚以实现切片为单位执行 Git revert；需要调查旧方案时读取 `codex/productize-typescript-quality-tooling-experiment`，不在新分支恢复双 runtime。

## Open Questions

无未回答开放问题，可以进入实现前审计。
