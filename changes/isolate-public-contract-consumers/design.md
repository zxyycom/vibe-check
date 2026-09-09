# Design

本设计先按消费者能力与依赖义务分类随包源码，再选择领域原位边界或专门父目录。目录表达 owner，静态校验强制依赖方向。

## Context

- [`src/index.ts`](../../src/index.ts) 是唯一 public package entry。package 同时交付可读 `dist/esm/**`、declarations、source maps 与 `src/**`，但物理随包文件不是受支持的 deep-import surface。
- [架构 owner](../../docs/development/architecture.md#source-module-boundaries)按 Check、Definition、Run、machine output、cache、waiver、learned strategy 等领域责任组织 `src/**`。[编码规范](../../docs/development/coding-style.md#81-目录表达模块关系)要求目录名表达明确关系，并以独立规则约束依赖方向。
- [`scripts/validation/layout-characterization.ts`](../../scripts/validation/layout-characterization.ts)以闭合集合校验顶层 Product owner 和部分 import boundary；新增或重组 owner 需要同步静态门禁与 fixture evidence。
- `createLearnedCriticalPathStrategy(...)` 应通过普通 public prepared strategy、graph/context 和 terminal timing 工作。其当前实现复用 `src/project-run/task-scheduler/critical-path-ranking.ts`，该依赖需要按能力语义核对。
- package-provided Check 构造器虽然从 package root 公开，却同时拥有 options、execution、scanner、Finding、Record 与 settlement 适配；其实现委托 Check-private 模块不等同于 public-contract consumer 越界。
- `cacheJsonByKey(...)`、`presentCheckFindings(...)`、`reconcileFindingWaivers(...)`、`collectProjectFiles(...)`、`createAdmissionGraph(...)` 和 learned strategy 的输入、生命周期、I/O 与内部依赖不同，需逐项证明是否共享 public-contract consumer 不变量。

## Goals / Non-Goals

目标是定义可供实现者和静态校验共同使用的能力分类，识别真实的 public-contract consumer，为其选择领域明确的目录或模块 owner，并以允许依赖、package root、declarations、source maps、artifact 和外部 consumer 验证归属调整。

边界保持不变：Product facade 可以委托其私有实现；package-provided Check 保有领域责任；public surface 仍由 package root 定义；`scripts/**` 仍属于仓库开发工具；本 Change 只调整归属与依赖门禁，不改变 helper、Check、Scheduler、Run 或 output 的行为契约。

## Decisions

### Intended Change

以下暂定方向须在形成 Plan 前由公开导出 inventory 和 dependency graph 收敛：

1. 将随包 runtime 能力分为至少四类：Product facade、package-provided Check、只消费公共契约的 package tool、只服务仓库工作的 development tool。分类依据是责任、输入、生命周期、失败语义和允许依赖，而不是是否从 `src/index.ts` 导出。
2. public-contract consumer 的 allowlist 仅包含 package consumer 同样可获得的稳定 DTO、callback、context，以及明确获准的无 Product 特权基础能力。private Scheduler state、collector、Invocation、Check settlement store、diagnostic writer 和 machine publisher 位于边界之外。
3. 在“领域 owner 原位加边界”和“`src/package-tools/<domain-owner>/` 父层”之间选择。仅当 inventory 证明多个能力共享同一 public-contract consumer 不变量，且子目录仍能表达各自领域 owner 时采用父层。
4. 目录采用与否都必须由 fail-closed import validation、正反 fixture 和真实源码检查强制；package root export visibility 与 dependency permission 继续是两个独立门禁。
5. 归属调整按语义 owner 分组，并与行为重构分别记录和验证。不满足共同契约的能力保持原 owner，目录统一不单独构成增加 wrapper 或 compatibility re-export 的理由。

### Resulting Impacts

- **Architecture/coding owner:** 更新 `src/**` owner、父子关系和允许依赖方向，解释“随包、public root、public-contract consumer”三者区别。
- **Layout validation owner:** 更新顶层 owner characterization，并为新边界增加允许/拒绝 import fixture；目录本身不作为充分证明。
- **Public/package owner:** 核对 `src/index.ts`、public inventory、compiler roots、declarations、source maps、source shipment、artifact audit 和 installed external consumer；不新增 deep-import export。
- **Existing capability owners:** 对每个 public runtime value 记录分类与依据，仅调整符合结果边界的集合。package-provided Checks 默认保留在各自 Check owner；独立 public-contract helper 由 inventory 单独识别。
- **Decision owner:** 若采用新的长期 package-tool owner 或改变既有 helper 的允许依赖，建立或演进 active Decision，并在实现与文档对齐后验证 alignment。
- **Downstream Change:** Scheduler performance reference 的最终模块位置与 dependency test 依赖本 Change 的边界结论，但其指标语义、公共 API 与价值证据由独立 Change 拥有。

## Risks / Trade-offs

分类过宽会形成内容杂乱的工具目录并放行 Product 特权，分类过窄则可能复制核心算法或制造反向依赖。路径调整还会触发 declarations、source maps、source provenance、docs 和测试变化，因此 inventory 必须同时限制调整范围并证明每项调整的依赖价值。

## Open Questions

- inventory 中哪些导出满足完整的 public-contract consumer 定义，哪些属于 Product facade 或 package-provided Check？
- inventory 是否支持 `src/package-tools/<domain>/` 父层；若不支持，哪些领域 owner 需要各自的 dependency boundary？
- public-contract consumer 的基础模块 allowlist 如何闭合，`createAdmissionGraph(...)` 与 learned critical-path helper 的共享算法应归属哪一层？
