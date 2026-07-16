## Context

现有 TypeScript quality tooling 已经形成完整调用链：收集并分类 scan inputs，运行 scc、Lizard 和 jscpd，生成 file/function/duplicate metrics，完成 code-area aggregation、baseline/cache comparison、warning、accepted-warning handling、gate 和 report/artifact projection。这套实现及其固定检测栈直接成为产品基础。

产品化缺口集中在运行和治理边界。`quality-core`、foundation 与 parallel-task-runner 仍通过 `scripts/tools/*` git submodule 提供源码；scanner 依赖、入口和默认配置仍由脚本约定；artifact/cache/temp state、错误映射和长期 owner 尚未形成正式产品边界。

设计路径是：先锁定现有行为，再收归 runtime source closure，把现有入口、scanner wrappers、typed config 和 availability checks 提升为正式产品模块，完成本地验收后切换仓库默认入口。

## Goals / Non-Goals

**Goals:**

- 将现有 TS quality tooling 确立为唯一产品 core 和业务 policy owner。
- 以可执行回归基线保持现有完整检测行为。
- 将 product runtime source closure 收归 Vibe Check，形成单仓模块化单体。
- 将现有 scc、Lizard/Python 和 jscpd 集成提升为产品管理的内建检测栈。
- 建立正式 TS/Bun entry、typed config、adapter、依赖、错误和可写状态边界。
- 在当前开发环境完成产品入口、既有行为和 owner contract 验收。

**Non-Goals:**

- 新 scanner backend、公开 plugin interface 或新的检测语义不属于本 change。
- 公开发布与平台分发不属于本 change。
- 性能基准、资源预算和性能优化不属于本 change。
- 当前开发环境承担执行验收；指定平台的发布或验收矩阵不属于本 change。

## Decisions

### Decision 1: 现有 TS quality tooling 是产品基础

`scripts/quality/**` 与 `quality-core` 已经拥有完整检测和业务 pipeline，因此直接迁为产品实现。迁入前用可重放 inputs 和期望结果锁定 scan planning、code-area classification、baseline/cache、scanner parsing、metrics、warnings、accepted warnings、gate 和 report/artifact behavior；每个迁入 slice 都用同一证据验收。

现有 CLI、output、exit-code 和 scan-scope owners 继续定义正式入口的外部 contract；TS product core 保留完整 engine capability，并在入口和输出层完成对应投影。

### Decision 2: Vibe Check 拥有 product runtime source closure

Vibe Check 以单仓模块化单体拥有正式 local CLI、product core、scanner adapters、domain model、toolchain config 和验证入口。先固定 submodule revisions、worktree state、licenses 与 behavior baseline，再根据 import inventory 迁入 `quality-core` 和产品运行期实际需要的 foundation / task-runner helpers。Production import audit 负责证明 runtime source closure 完整且由本仓库拥有。

仍只服务 docs validators、workspace verifier 或其它仓库 automation 的 toolkit 可以继续作为开发依赖。只有对应 gitlink 没有剩余消费者时才在本 change 删除，避免把产品源码收归扩张为无关脚本重写。

### Decision 3: TS/Bun 拥有完整 control plane 与 product policy

TS/Bun 负责正式 invocation、scan scope、scan planning、code areas、baseline、cache、metrics aggregation、warning、accepted-warning handling、gate、diagnostics 和 report/artifact projection。Repository dogfooding entry 与 CI automation 消费同一 product API；仓库专用 include/exclude、code-area definitions 和 accepted-warning records 通过 typed consumer config 传入。

Scanner adapter 只负责执行既定检测组件并返回 normalized observations、provenance 或 failures，不拥有 threshold、severity、blocking、warning identity 或 output projection。

### Decision 4: 产品检测栈固定为 scc、Lizard/Python 和 jscpd

LOC/file metrics 使用现有 scc wrapper；function NLOC、cyclomatic complexity 和 parameter count 使用现有 Lizard/Python wrapper；duplicate detection 使用现有 jscpd wrapper。三个 adapter 的 parsing、normalization、ordering、code-area assignment、cache interaction 和 failure projection 由产品化回归 fixtures 固定，并随源码一起迁入 product modules。

现有 typed `tools` config 对每项 capability 声明 command、固定参数与显式 override，现有 tool-availability checks 验证组件可用性。产品化将这些机制与 wrappers 一起收归 product modules，并统一依赖解析和 diagnostic；组件缺失、版本不兼容或协议不匹配必须产生可行动诊断。

### Decision 5: 影响结果的组件信息进入状态 identity

Tool version、影响结果的固定参数、parser/normalization identity 和 product config 进入 cache 与 baseline identity。只有这些信息与 input semantics 兼容时才复用旧状态；不兼容时产生明确的重新扫描或 baseline 处理结果。

### Decision 6: 当前开发环境承担产品化验收

正式入口是 repo-owned TS/Bun local CLI。产品化验收在当前开发环境执行，复用仓库已支持的 Bun、scc、Lizard/Python 与 jscpd toolchain；typed config、availability checks 和 diagnostics 使运行条件显式可检查。

验收覆盖真实 human/JSON scans、现有行为、依赖与配置边界、scanner failures 和 owner contracts，并以正式 local CLI 的可执行证据作为完成条件。

### Decision 7: Path 与 process 边界保持平台中立

Path 与 process code 使用 Bun/TypeScript platform APIs、structured arguments、explicit cwd 和 no-shell invocation。相关 tests 使用 POSIX/Windows lexical values、空格、Unicode 和引号覆盖解析边界；validation scripts 使用 runtime API 表达路径与进程调用。当前开发环境提供本 change 的执行证据。

### Decision 8: 仓库默认入口形成单一产品路径

Repository default CLI、dogfooding scripts、validation commands 与 owner docs 在 source ownership、回归、依赖、owner contract 和本地验收全部通过后切换到 TS/Bun product core。完成后这些入口共同消费同一产品实现。

## Risks / Trade-offs

- [Risk] 一次性迁入多个 toolkit 时遗漏隐式 runtime import 或改变现有行为。→ 固定 revisions 与 worktree state，建立完整 import inventory，并在每个迁入 slice 后重跑同一回归 suite。
- [Risk] Repository-specific config 被误放进 product defaults。→ Product core 接收 typed config；Vibe Check 自身的 include/exclude、code areas 和 accepted warnings 留在 dogfooding consumer，并用 dependency audit 证明方向。
- [Risk] 当前环境中的隐式 PATH、Python 或 `node_modules` 状态掩盖依赖要求。→ 复用并产品化现有 tool config 与 availability checks，增加 missing/wrong-version tests。
- [Risk] 路径或进程调用依赖当前 shell 行为。→ 使用 platform APIs、structured args 和 lexical edge-case tests 固定边界。
- [Risk] 现有 engine 结果与 CLI/output owner 的投影不一致。→ 为入口与 projection 建立 owner contract tests，同时保留 core 的完整数据。

## Migration Plan

1. 固定 source/dependency provenance、runtime import closure、现有行为基线与 owner contract 对照。
2. 迁入 product source closure，建立正式 TS/Bun entry、typed config 和 product module boundaries。
3. 将现有 scanner wrappers、tool config、availability checks、normalization 和 failure mapping 收归正式模块。
4. 在当前开发环境完成真实扫描、错误路径和完整回归，通过后切换仓库默认入口并同步长期 owners。
