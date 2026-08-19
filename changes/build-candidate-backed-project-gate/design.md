# Design

本 Design 将 Project Gate 的功能建设与 workspace-verifier cutover 分离：本 Change 只建立并证明 candidate-backed consumer，后续 Change 才切换仓库唯一门禁入口。

## Context

当前 workspace verifier 的 scripts-only tree 有 20 个 command leaves：routine required 运行 14 个，full 运行 19 个。它同时拥有 command/environment、dependency/mutex、warning/visible-output filtering、日志、completion grouping 和 process exit mapping。Product 已能执行 imported Definition；前置 [add-project-run-invocation-controls](../add-project-run-invocation-controls/) 与 [add-project-run-lifecycle-feedback](../add-project-run-lifecycle-feedback/) 分别收敛 partial-run input 与可信 lifecycle feedback。

[establish-npm-package-candidate-and-quality-dogfood](../establish-npm-package-candidate-and-quality-dogfood/) 提供 candidate identity 和 package-dogfood evidence。若 controls/feedback 改变 public package closure，本 Draft 必须要求刷新 candidate handoff，而不能把过时 tarball 当作依据。

## Goals / Non-Goals

### Goals

- 建立一个 project-owned Gate Definition、bound Run 和预切换 adapter，经 built/exact-tarball package 运行，不直接导入 Product source。
- 把必要的仓库门禁类别表达为普通 project Check callbacks：quality、format、product/scripts typecheck 与 lint、product tests、docs validation、decision/test-evidence catalog checks、Git whitespace 与 foundation package acceptance。
- 用前置 invocation controls 让 Check 依据本地 static tags 返回 <code>not-applicable</code>，并用 lifecycle feedback 构造项目 renderer 的进度、日志和摘要。
- 以一次固定、实测的 scheduler capacity 执行该 static graph；不继承 caller-controlled global concurrency。
- 通过对照和 exact-tarball acceptance 形成 <code>gate-readiness-handoff.md</code>，供后续 cutover 审阅。

### Non-Goals

- 不改变当前正式 workspace verification command、CI/workflow/documentation 的权威入口，也不删除或隐藏旧 verifier。
- 不定义 Product invocation grammar、observer semantics、timestamp/duration 的 canonical policy、Product CLI 或 configuration discovery。
- 不逐字迁移旧 report grouping、success-output regex、CLI aliases、internal adapter types 或所有 optional leaf behavior。
- 不公开发布 npm package、访问 registry/credentials，或宣布外部项目采用该 adapter。

## Decisions

### 1. Gate 是 repository consumer，不是第二个 Product runtime

Gate Definition、bound Run、process closures、failure interpretation、project renderer 和本地 logs 均属于 repository scripts。Product 继续只执行 imported Definition 并返回 structured facts；它不认识本仓 command、profile、tag、exit code 或 terminal format。

### 2. 以必要门禁类别而非 legacy parity 作为建设标准

旧 verifier 的 command definitions 是迁移输入，不是公共 API。新 Gate 必须覆盖对项目可信度必要的类别；无关核心结果的 grouping、regex、argv spelling 或内部 plumbing 可以删除或重写。每个类别要在 readiness handoff 中映射到新 Check、输入、输出和对照证据，避免按文件数量宣布完成。

### 3. Partial run 保持 Check-local

预切换 adapter 解析自己的 profile 和 repeatable disabled-tag input，并通过前置 controls 传递 immutable invocation context。每个 process Check 由本地 descriptor/closure 拥有 tags；相交时在启动 process 前返回 <code>not-applicable</code>。static graph 不做 scheduler-level selection，dependent Check 也不能假定 skip 自动传播。

### 4. Renderer 只消费 lifecycle feedback

项目 renderer 以 stable Check identity、admitted/settled events、counts 和 Product-measured duration 构造 progress、per-Check log 与 summary。完成后它消费 RunResult 的 per-Check duration summary；并行 completion order 不代表 Definition order。它不将显示选择反写为 Product Core 或 machine artifact，也不把 duration 自动解释为 quality failure。

### 5. Readiness handoff 是 cutover 输入

完成前必须写出 <code>gate-readiness-handoff.md</code>：candidate/tarball identity、必要类别映射、profile/tag semantics、N/A policy、static capacity、renderer/log/exit behavior、exact-tarball and comparison evidence、刻意未继承项，以及仍需 cutover 重新核验的条件。它把功能建设与不可逆删除分开。

## Risks / Trade-offs

- **对照假象：** legacy command 通过不证明新 Gate 覆盖相同核心类别；必须比较明确的类别和结果。
- **tag skip 错误通过：** <code>not-applicable</code> 是事实而非通行证；renderer 和 future cutover policy 必须显示并限制关键 skip。
- **process logs 与并行：** Check 必须安全写入 project-owned per-Check logs，human output 通过事件聚合。
- **package drift：** source 或 workspace fallback 会掩盖 package 错误；readiness 必须绑定 fresh candidate/exact tarball。

## Open Questions

- 预切换 adapter 的临时 command 名称与保留时长；它不得与最终唯一入口混淆。
- 哪些 disabled tags 允许在 CI 对照中使用，以及被跳过的关键类别是否应由 future cutover 拒绝。
- 需要何种对照：同一 revision 的类别矩阵、固定 fixture，或两者；Plan 时按每类可重复性确定。
