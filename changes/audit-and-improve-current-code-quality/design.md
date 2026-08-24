# Design

本设计让实施 AI 从同一文档恢复精确语料、三级审查、owner batch、evidence 契约和验收出口，不把全量覆盖误解为每个文件都要修改或重复深审。

## Context

目标 AI 是本 Change 的 primary reviewer/implementer、independent reviewer 和主编排者。它们实际需要读取本 Change、`docs/navigation.md`、`docs/coding-style.md`、目标行为 owner、相邻源码与测试；测试变化时还要读取 Testing 与 Case maintenance。行为 owner 优先于编码规范，相邻代码只提供调用事实，不能放宽规则。

活动且已对齐的 [按问题形态约束实现风格](../../docs/decisions/choose-implementation-style-by-problem-shape.md) Decision 禁止用固定行数、强制模式、特定依赖或局部习惯代替工程判断。现有 repository quality policy 也没有覆盖全部 scripts 与测试代码，所以 lint、测试、quality 或 Gate 不能替代逐条语义 screen。

### Plan scope baseline

最终数量由 current-tree discovery 决定；下表只记录本 Plan 的基线与固定选择。

| Selection | 精确范围 | Kind / role | 基线数 |
| --- | --- | --- | ---: |
| Product 与 tooling TypeScript | `src/**`、`scripts/**` 的全部 `*.ts` | code：implementation 204、test 54、test-support 2、declaration 2 | 262 |
| Package API examples | `docs/examples/package-api/*.ts` | code / example-source | 3 |
| Configured TypeScript fixture | `fixtures/projects/configured-typescript/**/*.ts` | code / fixture-input | 4 |
| Project Skill runtime | `.codex/skills/**/*.mjs` | code / skill-runtime | 8 |
| Project Skill declarations | `.codex/skills/**/*.d.mts` | code / skill-declaration | 11 |
| Fixture wrappers | `fixtures/projects/configured-typescript/tools/controlled-lizard` 与 `.cmd` | code / fixture-wrapper | 2 |
| **Code subtotal** | 上述并集 |  | **290** |

以下33个可编辑输入作为 `behavior-config` 进入同一 manifest/ledger，但按各自 owner 审查行为、scope 与 consumer 一致性，不把 JSON/YAML/TOML 当成 TypeScript 风格代码：

| Group | 精确路径或受控 pattern | 数量 |
| --- | --- | ---: |
| Repository instructions/discovery | `AGENTS.md`、`.gitattributes`、`.gitignore`、`.rgignore` | 4 |
| Toolchain/build/package | `.oxlintrc.json`、`.oxfmtrc.json`、`package.json`、`scripts/project/package.json`、`pnpm-workspace.yaml`、`tsconfig.json`、`tsconfig.product.json`、`mise.toml` | 8 |
| Codex 与 Skill config | `.codex/config.toml`、`.codex/rules/vibe-check.rules`、六个 `.codex/skills/*/agents/openai.yaml`、Decision/Investigation 的两个 index schema | 10 |
| Test Evidence config | `scripts/test-evidence/sgconfig.yml`、`rules/*.yml`、`rule-tests/*.yml`、`supported-runner-profile.json` 与其 schema | 11 |

`.codex/environments/environment.toml` 与 `environment-2.toml` 作为 `generated-derived-config` 进入 manifest，只审查实际行为、生成边界与“不得手改”处置。基线总语料为325项；最终通过条件不依赖该数字。

显式排除 `archive/**`、`changes/archive/**`、lockfiles、source maps、Change governance/evidence、Markdown 与 product schema/example artifacts、依赖/cache/build/candidate 产物。`scripts/package/candidate/**` 是当前源码，不属于排除项；fixture 的 `ignored.generated.ts` 仍是受审 fixture input。全仓 code-candidate guard 还检查常见代码扩展名与 Unix executable regular file，未知候选必须先分类，不能静默跳过。

## Goals / Non-Goals

目标是穷尽覆盖最终语料、对风险使用足够审查深度、只实施 owner 支持的最小改进，并让结果可由路径、最终摘要、finding 和验证恢复。

本 Change 不要求每个文件产生 diff，不要求低风险 no-change 文件接受第二次逐文件深审，不按文件长度或 `if` 数量强制重构，不建立永久审计框架或 Gate，不在没有 benchmark/budget 时开展性能优化，也不预实现 feature Plan、未对齐 Decision、public/machine contract 或发布工作。

## Decisions

### Intended Change

1. 使用一个 Change-local scope、manifest 和 ledger 覆盖 code、behavior-config 与 generated-derived-config；最终摘要来自工作树原始 bytes。
2. 所有条目先 lightweight screen；只有风险责任、规范信号或实际修改触发 focused/deep review。
3. 按 owner 和调用链切成写入互斥批次，由子代理完成主要 screen、修复和自验证；不同 reviewer 只复核修改、实质 finding、deferred 与覆盖证据。
4. Accepted finding 只用最小 owner-aligned 改动闭合；不为跨批统一提前建立 helper、interface 或共享层。
5. Evidence verifier 只服务本 Change 并随其归档，不进入 `src/**`、通用 `scripts/**` 或永久 Project Gate。
6. Change 归档后，本次 ledger 不约束未来局部修改；未来工作继续遵循普通 owner、编码规范和风险相称验证。

### Resulting Impacts

| Trigger | 必须处理的影响 | 不允许的替代 |
| --- | --- | --- |
| Test node/body、runner/discovery、Case Owner/Proves 变化 | 使用 Test Evidence 流程；运行最窄测试和 strict closure；重读 Owner/Proves | 只运行测试或只证明 entity closure |
| Public entry、Core/Run/Output、schema/example、package/project consumer 变化 | 同步行为 owner并运行对应 contract、candidate、consumer 或 docs evidence | 复用旧 artifact identity 或只做 source check |
| Public contract、长期方向或当前 owner 冲突 | 记录 finding，路由 Decision/独立 Change或用户决定 | 在质量批次中静默选择新 contract |
| 新增、删除、rename 或 bytes 变化 | 只使相关 manifest/ledger 条目失效；批次内重新审查该影响面 | 重新审计全部无关文件 |
| Generated-derived config 变化 | 找到生成 owner并验证实际行为；没有 owner 时 escalated | 直接手改带生成标记的文件 |

## Risks / Trade-offs

- **表面穷尽：** 模板化 no-change 会隐藏漏审；具体职责、owner、风险信号、最终摘要和 batch coverage review 用于发现它，而不是让全部文件重复深审。
- **过度重构：** 全量范围容易放大风格偏好；只有带 owner 与风险机制的 finding 才驱动改动，no-change 是一等结果。
- **范围漂移：** 最终 discovery 连续运行两次并绑定工作树摘要；未知、untracked、missing、rename 或 symlink candidate 都 fail closed。
- **并行冲突：** 写入范围按 owner 互斥，reviewer 等待最终摘要稳定；吞吐降低但避免同一事实源被并发改写。
- **证据体积：** Ledger 每条只保存最小字段，S3 可以是紧凑说明，详细 evidence 只在修改、S0–S2 或 deferred 时产生。

## Open Questions

无。代码、行为配置、生成配置、发现算法、审查层级、reviewer 边界和最终验收均已在本设计中确定；新事实若改变这些边界，先更新本 Change 再继续实施。

## Agent Execution Contract

实施开始时，primary agent 从 manifest 领取一个写入互斥的 owner batch，并对每个条目完成一次 lightweight screen。只有下节的条件触发 focused/deep review。Primary agent 拥有 finding、最小修复和局部验证；independent reviewer 不修改被审对象，只复核修改、S0–S2、deferred、manifest/ledger 闭合及未修改集合的风险覆盖。需要修复时返回原 batch。

Reviewer 或 implementer 发现 public contract、machine schema、长期方向、未对齐 Decision、发布、credential 或外部状态问题时，只能记录并路由；本 Plan 不构成这些动作的授权。子代理模型和并发度服从执行时可用能力与当次授权，不写成持久工程前提。

## Review Levels

| Level | 适用对象 | Primary 最小动作 | Independent review |
| --- | --- | --- | --- |
| Lightweight screen | 每个最终 editable 条目；generated config 做等价行为/owner screen | 记录职责、owner、依赖/边界、问题形态、风险信号与处置 | 无信号且未改动可 `no-change-with-rationale`；只进入 batch coverage review |
| Focused review | 已修改；明显规范信号；public/output/process/filesystem/serialization/concurrency/lifecycle/shared-foundation 责任 | 读取相关 owner、相邻测试和最小调用链；记录 finding、修复和局部验证 | 所有修改与实质 finding 必须复核 |
| Deep review | S0–S2；安全/契约/权限边界；跨 owner 重复；测试证明改变；deferred | 明确 contract、失败路径、语义证明、最小方案与路由 | Reviewer 必须接受；S0/S1 不可 deferred |

Finding 严重度与关闭规则：

| Severity | 判定 | 关闭规则 |
| --- | --- | --- |
| S0 | 可能破坏安全、数据/发布完整性、外部权限或基本可执行性 | 必须修复，不可 deferred |
| S1 | 确定违反稳定 owner，造成错误成功、边界/生命周期错误或依赖方向破坏 | 必须修复，不可 deferred |
| S2 | 具体控制流、重复规则、命名/模块、抽象或测试证明风险 | 默认修复；defer 必须有 owner、风险、后续入口、当前理由和 reviewer acceptance |
| S3 | 收益明确但不遮蔽语义的局部问题 | 价值高于 churn 时修复；可只在 ledger 记录 |
| Observation | 没有可证实规则违例的偏好 | 不驱动改动 |

## Batch Protocol

每个 owner batch 按以下顺序闭合：

1. 从 manifest 领取路径集合；读取 Navigation、行为 owner、Coding Style、相邻代码与测试。
2. 对集合内每个条目完成 lightweight screen 并更新 ledger。
3. 对触发项先登记 finding 和最小处置，再完成 focused/deep review与必要修改；不跨 batch 预建抽象。
4. 测试证据触发时使用 Test Evidence 流程；否则只运行受影响 owner 的最窄语义证据。
5. 更新受影响 SHA 和 ledger，运行该 batch 所需的 typecheck、lint、format 或 integration evidence。
6. Batch 稳定后，independent reviewer 复核修改、S0–S2、deferred、ledger 闭合与未修改集合的风险覆盖。
7. Reviewer 退回项由原 batch 修复、重新摘要并复核；接受后才关闭该 batch。

批次内新增、删除、rename 或 bytes 变化只使相关条目失效。最终全树 freshness 是唯一重新枚举全部语料的时点。

## Evidence Contract

所有持久证据位于 `evidence/`：

| Artifact | 唯一用途 |
| --- | --- |
| `code-scope.json` | 固定 selectors、exact config paths、candidate guard 和 exclusions |
| `current-code-manifest.json` | 保存当前 path/kind/role/source state/mode/SHA-256 与 tombstones；它是唯一 inventory |
| `review-ledger.json` | 保存逐条 screen、处置、finding 引用、验证和 review；不复制 inventory 字段以外的规则 |
| `findings.md` | 汇总 S0–S2 与跨文件 finding；S3 可只留 ledger |
| `verification.md` | 记录 batch/final 命令、结果、未运行项与证明边界 |
| `verify-current-code-ledger.mjs` | Change-local discovery、manifest/ledger 双向闭合和 freshness checker |

Manifest 发现算法：合并 `git ls-files -z` 与 `git ls-files -o --exclude-standard -z`，应用 scope/candidate guard，以 `lstat` 检查 workspace 内普通文件且不跟随 symlink，按 slash path 排序并对工作树 bytes 计算 SHA-256；连续两次 discovery 不同则报 `unstable-worktree`。Missing tracked path 形成 tombstone，untracked candidate 正常进入 manifest，symlink 与未知候选 fail closed。

| Ledger field | 所有 editable 条目 | 触发时必填 |
| --- | --- | --- |
| `path`、`sha256`、`kind`、`ownerRef`、`reviewLevel`、`disposition`、`primaryReviewer` | 是 | — |
| `responsibility`、`riskSignals`、`rationale` | 是 | — |
| `findingId`、`severity`、`ruleOrOwnerRef`、`fileLine`、`riskMechanism` | Finding | 是 |
| `changeSummary`、`semanticEvidence`、`verification` | `modified` | 是 |
| `route`、`currentDeferralReason`、`independentReviewer`、`reviewerDecision` | Deferred 或 S0–S2 | 是 |
| `independentReviewer`、`reviewerDecision` | 任何修改 | 是 |
| `coverageReviewBatch` | 未修改集合 | 是 |

合法 disposition 是 `modified`、`no-change-with-rationale`、`deferred`、`removed`、`derived-reviewed` 或实施中的 `blocked`。最终 manifest 的每个 editable `(path, kind, role, sha256)` 恰有一个 closed ledger 条目；ledger 不得含 manifest 外条目。未知分类、读取失败、重复路径、过期 SHA、未闭合 tombstone、`blocked` 或缺失触发字段都阻断验收。

## Acceptance Contract

仅当以下条件同时成立时，本 Change 才可验收：

1. Final discovery、manifest 与 ledger 双向闭合，所有 SHA 对应最终 bytes，且没有 unknown/symlink/unstable candidate。
2. 每个条目至少完成 lightweight screen；每个修改、S0–S2 与 deferred 都有 independent reviewer 结论。
3. 没有 S0/S1；每个 S2 已修复或满足受控 deferred 条件；所有 batch coverage review 已接受。
4. 受影响 owner 已同步，测试与契约变化完成其专属证据。
5. 小修改只需最窄证据，batch 稳定后运行批次检查；最终执行并记录：
   - `bun run format -- check`
   - `bun run typecheck -- product` 与 `bun run typecheck -- scripts`
   - `bun run lint -- product` 与 `bun run lint -- scripts`
   - `bun run test-evidence -- check --root .`
   - `bun run validate`
   - `bun run quality`
   - `bun run decisions -- check`
   - `bun changes/audit-and-improve-current-code-quality/evidence/verify-current-code-ledger.mjs check --root .`
   - `bun run verify:vibe-check-workspace:full`
   - `bun run change-plan -- check changes/audit-and-improve-current-code-quality`
   - `git diff --check`
6. Final freshness、必要语义证据或 Full Gate 无法运行时，不能以风险说明替代验收。
