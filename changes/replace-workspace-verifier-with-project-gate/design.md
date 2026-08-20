# Design

本 Design 只处理 repository Gate 的正式切换与旧 verifier 退役；功能建设、public Run interaction 和 package candidate 分别由前置 Change 负责。

## Context

[build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) 应先提供 <code>gate-readiness-handoff.md</code>：当前 candidate identity、20-Check 类别映射、profile/tag/N/A semantics、固定 capacity、progress/log/exit behavior，以及 exact-tarball 与同 revision 对照证据。已归档的 [establish-npm-package-candidate-and-quality-dogfood](../archive/establish-npm-package-candidate-and-quality-dogfood/) 保存 artifact/dogfood 的形成时 handoff 与重新验证条件；current artifact 仍由 candidate preparation owner 生成。若 public package inputs 在 readiness 后变化，cutover 前必须重新 prepare 并刷新证据。

当前 [readiness handoff](../build-candidate-backed-project-gate/gate-readiness-handoff.md) 已存在，作为本 Draft 的输入；它不表示 cutover 已开始，也不授权修改正式 binding 或删除 legacy verifier。

当前 workspace verifier 是独立 scripts-only implementation，且其命令、CI/workflow、文档或开发者脚本可能有多处引用。本 Change 的风险在于正确切换每个权威入口并删除旧 implementation，而不重新解释每个 Check 的功能结果。

## Goals / Non-Goals

### Goals

- 审阅 readiness handoff，确认必要类别、exact package evidence、partial controls、progress/output 和 exit behavior 已可作为正式 gate 使用。
- 将仓库 root scripts、CI/workflow 与文档接线到同一个 Project Gate implementation；命令名称或 alias 只是接线细节，不是本 Change 的决策，保留的 wrapper 只能薄转发。
- 正式 repository/CI bindings 调用无 disabled tags 的 required/full；这是调用契约，不是 CI host 上的运行时禁令，local adapter 保留显式 partial invocation。
- 更新全部 root script、CI/workflow、文档与测试中的 legacy verifier 引用；确认引用为零后删除旧模块，并保留清晰的 VCS rollback 边界。
- 从实际接线后的 root/CI bindings 运行无 disabled tags 的 required/full，并写出 <code>gate-handoff.md</code> 给 release Change。

### Non-Goals

- 不新增或重写 Check callback、类别映射、Process adapter、profile/tag grammar、observer/renderer、scheduler capacity 或 package build。
- 不更改 invocation controls、lifecycle feedback、timestamp/duration policy、Product CLI 或 public package exports。
- 不访问 npm registry、凭据或执行 npm publish；也不以 cutover 补偿 readiness evidence 的缺口。

## Decisions

### 1. Readiness evidence 是切换的硬前置

没有完成且与当前 candidate 相匹配的 readiness handoff，就不更改正式 bindings 或删除 verifier。若 handoff 没有证明类别闭合、artifact identity、profile/tag/N/A、progress/log/exit 或无 disabled-tag required/full readiness，工作返回 Gate-build Change，而非在 cutover 中补建 Gate 能力。

### 2. 只保留一个权威 implementation

正式 root scripts、CI 和文档均指向 Project Gate。命令名称或 alias 不承载产品语义，也不是本 Change 的待决选择；无论沿用还是调整名称，所有保留调用都必须到达同一 implementation，不能继续维护第二套 command tree、profile selection 或 result interpretation。

### 3. 删除必须可核对且可回退

先更新全部 root script、CI/workflow、文档和测试中对旧 verifier 的引用，再确认旧 verifier 的引用为零；只有此时才删除旧模块及其无调用者的测试或说明。回退是恢复该 Change 的 source/binding references，不是让新旧实现长期并行成为两个门禁真相。

### 4. Cutover handoff 是公开发布的唯一 gate evidence

<code>gate-handoff.md</code> 记录实际 repository/CI bindings、候选 identity、覆盖类别、无 disabled-tag 正式调用契约、固定 capacity、output/exit/log evidence、刻意未继承项、legacy reference audit 结果与重新验证条件。[publish-public-api-only-npm-package](../publish-public-api-only-npm-package/) 只能消费它，不得把 registry publish 当作补齐仓库迁移的手段。

### 5. CI 完整性是调用契约，不是运行时禁令

正式 repository root scripts 与 CI/workflow 必须调用无 disabled tags 的 required/full，因此正式配置不能关闭某些 Check。这是调用契约，不是 CI host 上的行为禁令：Gate adapter 不读取 ambient `CI` 标记，也不因 local partial command 在 CI host 上运行而拒绝它；contract review 和 workflow/root-script evidence 证明正式调用没有传 disabled tags。

## Risks / Trade-offs

- **隐藏调用者：** 未发现的 package script、CI 或文档引用会留下双入口；需要 repo-wide reference audit。
- **artifact 过期：** cutover 时 package/public interaction 已变更会使 readiness evidence 失效；应回到 candidate/gate-build 刷新。
- **删除过早：** 不完整 category mapping 会失去已知门禁；删除前必须从完成接线后的 bindings 通过 required/full 验证。
- **转发漂移：** 保留的 command wrapper 若自行解析参数或生成结果，会重新长成第二个 verifier；只允许薄转发。

## Open Questions

无。命令名称或 alias 不是本 Change 的决策；正式 repository/CI 调用必须使用无 disabled tags 的 required/full；cutover 验收从实际接线后的 root/CI bindings 运行这两个 profile；更新全部 root script、CI/workflow、文档与测试引用并确认旧 verifier 零引用后删除旧模块。
