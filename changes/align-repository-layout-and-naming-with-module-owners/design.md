# Design

本设计用一套可检查的 module owner 与 naming 规则重建 Product 和 repository scripts 的源码树，并以 ledger-first、move/rename-first 的阶段迁移避免结构整理成为隐式重构。

## Context

当前稳定运行边界由 `docs/architecture.md` 与 `docs/script-tooling.md` 拥有：`src/product/**` 是 Product runtime，scripts 单向消费 Product；`quality` 是 neutral dogfood root entry，Project Gate 是项目拥有的 bound Project Run adapter，package candidate 是 private physical consumer evidence。`docs/coding-style.md` 要求模块按变化原因组织且只允许 `scripts/** -> Product source` 的单向依赖。

本 Change 的结构审计统计到 114 个 Product production modules 与 88 个 scripts production modules；两棵 runtime value-import graph 当前都没有循环 SCC。问题不是循环或无法运行，而是路径层级与实际 owner 不一致：Product root、public entry、Core/Check/Output、quality/gate、package/consumer 与 foundation/validators 的责任在目录中被重复、嵌套或历史包装层遮蔽。

活动未对齐决策 `align-source-layout-and-naming-with-module-owners.md` 是本 Change 的长期方向规格。`use-programmatic-api-as-product-entry.md`、`expose-minimal-check-and-run-public-surface.md`、`complete-project-gate-before-public-package-release.md`、`integrate-foundation-into-workspace-assurance.md` 与 `make-bun-entries-use-pinned-tools.md` 继续约束 API-only 产品入口、public inventory、发布顺序、foundation assurance 与 locked entry；结构迁移不得重新打开这些行为决定。

执行时按下表恢复权威性，不能用目标 Plan 覆盖尚未实施的当前事实：

| 信息 | 权威 owner | 使用规则 |
| --- | --- | --- |
| 当前运行行为与路径 | 当前源码、测试及 Navigation 指向的领域文档 | 在目标迁移完成并验证前仍是 current fact。 |
| 长期结构与命名方向 | `align-source-layout-and-naming-with-module-owners.md` | 约束方案；`active + unaligned` 不表示已经实施。 |
| 本次结果、范围与成功标准 | `proposal.md` | 不从 tasks 或局部 ledger 扩大范围。 |
| 实施规则、例外与暂停条件 | `design.md` | 迁移代理的直接操作契约。 |
| 顺序与进度 | `tasks.md` | Checkbox 只在对应证据已经形成后更新。 |
| 逐文件目标与基线证据 | 本 Change 的 `readiness/**` artifacts | 当前已覆盖 322 个 tracked 路径并通过 schema、唯一性与 start-gate 复核，是本次迁移的唯一 source-to-target handoff；不能反向改写长期 Decision。 |
| 历史形成时路径 | archived Decision/Change | 只用于历史审计，不参与 current path 或命名验收。 |

目标一级结构为：

```text
src/
├── index.ts
├── contract/
├── definition/
├── checks/
├── core/
├── run/
├── output/
├── scheduler/
└── foundation/

scripts/
├── development/
├── environment/
├── foundation/
├── validation/
├── docs/
├── package/
│   ├── artifact/
│   └── candidate/
├── project/
│   ├── package.json
│   ├── quality/
│   └── gate/
├── decision-records/
└── test-evidence/
```

## Goals / Non-Goals

**Goals:**

- 让 AI 或维护者从 source root、父目录、module entry 和依赖方向恢复唯一 owner，不依赖迁移历史或口头说明。
- 让 `src/index.ts` 同时成为 public API source owner、runtime build entry 与 declaration root，release tooling 只消费它。
- 让目录、文件和主要导出使用具体领域职责命名；除显式批准的外部边界外，不使用 `index.ts` 代替入口命名。
- 让 Definition、built-in Check execution、Core facts、Run orchestration、Output publication 和 Scheduler 的目录层级匹配现有架构责任。
- 让 repository quality 与 Project Gate 作为一个 private consumer 下的同级 Project Run，package artifact/candidate 与 consumer 保持单向依赖。
- 用同输入对照、current owner 同步和完整 Gate 证明除已授权退出的临时 CLI diagnostic 外，结构迁移没有改变行为。

**Non-Goals:**

- 除删除临时 Product CLI migration diagnostic 外，不改变 Check/Run/Core/Record/publication/scheduler 语义、public API、machine schema、scanner backend、cache policy、progress、Gate membership 或 exit mapping。
- 不实现 MIT material、正式 `0.0.x` version、Bun host contract、registry authority、credential、publish 或 post-publish acceptance。
- 不恢复独立 Foundation package、workspace、tsconfig 或 Gate identities，也不建立通用 service/controller/utils/shared/workflows 层。
- 不机械重写 archived Change、archived Decision 或其它形成时材料；它们不参与当前 owner 和验证。
- 不因文件行数顺便重写控制流、类型模型或测试语义；非路径型代码改动只允许承接必要的 entry/owner 拆分并须独立验证。

## Decisions

### Intended Change

#### 1. 使用同一 module 与 naming grammar 组织两棵 source tree

`src/` 和 `scripts/` 分别是 Product runtime 与 repository automation 的完整 source root。一级目录表示稳定 owner；owner 内部局部职责使用文件，只有存在独立消费者、生命周期或多个子职责时才增加子目录。目录使用领域 owner 名词，文件使用具体能力、动作、结果或边界名称，主要导出使用领域对象或动作名称。

`src/index.ts` 是当前唯一预批准的 `index.ts`，因为它是 npm package public export root。其余 existing/new `index.ts` 默认改为描述行为的 basename；只有外部工具或稳定消费契约确实要求目录默认入口时，才能在 ledger、owner 文档和目标验证中逐项记录例外。`current`、`model`、`types`、`common`、`shared`、`utils`、`helpers`、`tools` 与 `workflows` 等泛化名称也必须证明在局部 owner 中具有单一含义，不能因旧名或惯例自动保留。

每个目标名称按以下顺序判断，前一项未闭合时不进入后一项：

1. **先定 owner：** 根据职责、变化原因和消费者选择现有目标一级模块；不能为了获得更好看的名称新建 owner。
2. **再定文件职责：** 一个文件只用一个可命名结果、动作或边界作为 basename；多项职责只有在能够独立变化或验证时才 `split`。
3. **再定导出：** public export 名称保持 approved inventory；internal export 可以随 owner/name 修正，但必须闭合全部消费者并保持行为。
4. **再查局部区分度：** basename 与父目录组合后必须能区分同 owner 内其它文件；不能依赖调用方记忆“这个 index/model/current 指什么”。
5. **最后审查例外：** `index.ts` 或泛化名称只有在具体 external contract、所需路径、永久规则 owner 和验证命令齐全时才可保留。新增 `index.ts` 例外触发暂停并修订 Decision/Change，实施代理不得自行批准。

完成迁移后，`docs/coding-style.md` 是全局 naming grammar 与 `index.ts` allowlist 的 current rule owner；具体 external contract 的领域文档拥有例外理由和验证入口。Decision 保存长期取舍，ledger 只保存本次逐文件应用，三者不能互相替代。

测试默认与所属源码共置，`task-scheduler/test/**` 与 `scripts/tools/foundation/test/**` 等历史例外迁到 owner 目录。`*.test-support.ts` 只有真实消费者时保留；caller audit 证明无消费者的 support/fixture 删除，不迁入新的全局 test helper 池。

`src/product/README.md` 迁为 `src/README.md`，继续保存 initial-lift provenance；只更新因 source root 上移而失效的 current Navigation/Architecture 相对链接和目录表述，不把历史正文改写成当前模块规格，也不删除其形成时 commit 依据。

#### 2. 让 Product source root 与 package entry 成为同一 owner

把 `src/product/**` 上移到 `src/**`，并把 `scripts/package-candidate/entry.ts` 的 approved export projection 移为 `src/index.ts`。Package artifact runtime build 与 declaration emit 都从该入口开始，declaration entry 收敛到 target staging 的 `types/index.d.ts` 或由目标 `rootDir=src` 确定的等价唯一路径；这里的 generated declaration basename来自 package export contract，不授权 source 内部增加其它 `index.ts`。

现有 `CURRENT_PUBLIC_CONTRACT` 拆为两个变化原因：public symbol inventory 留在 `src/contract/public-api.ts`，由 package audit 与 contract tests 消费；effect defaults 迁到 `src/definition/effect-defaults.ts`，Definition 不为读取运行默认值依赖发布 inventory。两者保持一个当前值 owner，不从 build output 反向补造。

#### 3. 按架构责任拆除 quality-core 聚合层

`definition` 继续拥有 Project/Check authoring grammar、normalization、validation 与普通默认 Check value assembly；`checks` 拥有 built-in Check execution、exact input、measurement、scanner adapter、finding/Record projection 与其共享私有模型；`core` 只拥有 Check/Record facts、canonical materialization、store、session 与 validation；`output` 拥有 machine v4 model/schema/mapper/serializer/validator 与 atomic file publication；`run`、`scheduler` 和 `foundation` 保持各自现行责任。

`quality-core/check-record/plain-record-values.ts` 等跨 Definition/Run/Core 使用的 generic closed-value primitive 迁到 Product foundation；`scan-command/publication-*` 迁到 output，revision/tool metadata 迁到实际 producing Check 或 shared input owner。`scanner-dependencies` 的单文件 aliases 进入 Checks 内部 scanner command owner，不保留伪一级模块。

#### 4. 用 scripts/project 建立唯一 private consumer root

把 `scripts/quality/package.json` 迁到 `scripts/project/package.json`，使该目录成为 local candidate 的唯一 physical private consumer root。Neutral dogfood 位于 `scripts/project/quality/**`，Project Gate 位于 `scripts/project/gate/**`；两者从同一个 exact installed `vibe-check` 解析 public API，但各自拥有 Definition、bound Run、controls、adapter 与失败映射。

现有 `scripts/package-candidate/run-quality.ts` 迁为 `scripts/project/quality/locked-run.ts`。现有 `scripts/quality/index.ts` 的职责迁入 `scripts/project/quality/run.ts`：它只负责进入 repository-pinned mise 后启动同 owner locked workflow；locked workflow 先调用 package candidate prepare，再调用 quality scan。这样依赖为 `project/quality -> package/candidate`，package module 不再动态导入 consumer，也不保留默认 `index.ts` 入口。

Gate 的 `catalog/controls/index` 与现有 `quality/project-gate/**` 合并到 `scripts/project/gate/**`；process/native/test-evidence checks 放入该 owner 的 `checks/`。Gate adapter 仍只准备一次 candidate，并校验 resolved installed entry 与准备 receipt 完全一致。

#### 5. 分开 package artifact 与 candidate lifecycle

当前 `scripts/package-candidate/index.ts` 按已审核 ledger 拆为两组文件。`scripts/package/artifact/{fingerprint,build,manifest,pack,audit}.ts` 唯一拥有 source fingerprint input、runtime build、declaration emit、manifest projection、staging allowlist、pack、tar parsing、digest 与 exact artifact audit；`scripts/package/candidate/{prepare,receipt,install}.ts` 只拥有 local version、state/receipt、safe reuse、private install 与 installed-entry/dependency inspection。现有 CLI adapter `scripts/package-candidate/prepare.ts` 另迁为 `scripts/package/candidate/prepare-command.ts`，不与可复用的 `prepare.ts` 混为同一入口职责。

Artifact 接收明确 version/material input并构建 `src/index.ts`；local candidate 继续使用 fingerprint-bound local version。正式发布 adapter 只有在独立 release Change 中才建立，并必须复用同一 artifact owner；本 Change 不建立空 `release/` 目录或 registry operation。

#### 6. 让 scripts capability、入口与名称按 owner 归位

- `scripts/tools/foundation/src/**` 展开到 `scripts/foundation/**`，测试共置；它继续是 ordinary repository source，不形成 package boundary。
- `scripts/tools/validators/**` 与 root `scripts/validate.ts` 归到 `scripts/validation/**`；docs-specific orchestration留在 `scripts/docs/validate.ts`。
- `scripts/docs/package-api-docs/**` 归到 `scripts/docs/package-api/**`，同前缀 machine example/schema 文件归到 `scripts/docs/machine-artifacts/**`。
- `scripts/project-environment/**` 归到 `scripts/environment/**`；`scripts/decision-records.ts` 归到 `scripts/decision-records/**`；`development` 与 `test-evidence` 已有完整 owner。

Root commands 绑定以下已审核入口，不再留待实施时命名：

| Capability | Target command entry |
| --- | --- |
| Development | `scripts/development/command.ts` |
| Environment | `scripts/environment/manage.ts` |
| Package API docs | `scripts/docs/package-api/command.ts` |
| Decision records | `scripts/decision-records/command.ts` |
| Test Evidence | `scripts/test-evidence/command.ts`；删除原 `scripts/test-evidence/index.ts` wrapper |
| Workspace validation | `scripts/validation/workspace.ts` |
| Repository quality | `scripts/project/quality/run.ts` |
| Project Gate | `scripts/project/gate/run.ts` |
| Candidate preparation | `scripts/package/candidate/prepare-command.ts` |

Root package scripts 只更新到这些 owner entry，不增加同义 aliases。`env:setup`/`env:check` 与 Project Gate profile suffix 的兼容数量和语义保持现状；`product:cli` 直接删除，不增加替代 alias。

#### 7. 使用布局与命名账本及行为对照，而不是边移动边重构

已建立的逐文件 ledger 记录每个 tracked current source/test/config/doc/Case path 的 `move`、`rename`、`move-and-rename`、`split`、`delete` 或 `unchanged` 结果，以及目标 owner、目标 basename、主要导出、内容处理、名称表达的职责和泛化名称/`index.ts` 例外证据；`split` 只来自已确认的责任分离，`delete` 均带 caller/registry/fixture audit。每个阶段先移动或重命名 owner 与 import，再运行最窄验证，不把格式化噪音、逻辑优化或 public API rename 混入结构 diff。

临时 Product CLI diagnostic 是本 Change 唯一预先确认的行为退出项：删除 `src/product/cli/**`、`product:cli`、当前 `docs/cli.md` owner 和对应 Case，并同步 Navigation、AGENTS 与 testing catalogs。它不迁移、不进入 candidate，也不产生替代命令；archive 保留形成时引用。

迁移前保存 public export/type inventory、candidate file allowlist/input fingerprint、machine v4 fixtures、quality facts 与 Gate result基线；迁移后使用同一输入对照。Current docs、package API registry、Test Evidence entities/Cases 与 active Change handoff 跟随目标 path 同步；archive 保持原 bytes/path。

### Resulting Impacts

- Product/source 与 scripts 的大多数相对 import、dynamic URL、rootDir/include/glob、format/lint/test scope 和 docs source registry会改变；所有路径和名称 consumer 必须由 ledger 显式闭合。
- Candidate source fingerprint、receipt consumer directory、resolved entry 与 installed dependency path会因 owner 迁移变化；reuse 必须检测新路径并安全重建，禁止接受旧 receipt 或祖先依赖作为成功。
- Declaration tree 的内部路径会变化。Exact package acceptance 必须证明 root export/type inventory 和 isolated consumer compile/runtime 行为相同，不能只比较 bundle 能否生成。
- Test 文件 move 会改变 Test Evidence entity ID；Case catalog、runner profile 和目标测试命令必须在同一 implementation阶段更新，并在每批 test move 后运行完整 closure。
- 临时 CLI diagnostic 退出会删除一个 root command、一个 Product test entity 和一个 semantic Case；当前文档不得继续暗示存在 CLI compatibility entry，package acceptance 继续证明没有 `bin`。
- Owner docs 与 AGENTS route 必须在稳定代码落位后切换为目标 current facts；迁移过程中 Change ledger 是临时路径映射 owner，不能让旧、新路径同时成为长期规范。
- Active feature Plans 中的具体 path 假设需要按当前实现重新审阅；只更新仍影响其实施入口的 current path，不借本 Change重写其 feature contract或刷新全部陈旧基线。
- Publish Draft 依赖本 Change 的 exact candidate handoff；结构 Change 完成前不得把旧 artifact receipt 视为当前 release evidence，也不授权任何外部 registry/credential操作。

## Risks / Trade-offs

- **大规模 move/rename 掩盖行为改动。** 使用逐文件布局与命名 ledger、move/rename-first commits、局部 diff 和迁移前后同输入对照；非路径/名称代码变化单独列账并由 owner tests证明。
- **泛化名称被机械替换成另一套泛化词。** Ledger 必须写明名称表达的领域职责和消费者查找方式；review 不以禁词替换为完成，而以局部名称能否区分 owner 内职责为准。
- **public declaration 可编译但内部引用漏包。** 对 exact tarball 做 isolated install、public typecheck、runtime import 和文件 allowlist audit，不只检查 `src/index.ts`。
- **private consumer 移动后意外从 ancestor node_modules 解析。** Candidate install 继续替换唯一 consumer install，receipt 绑定 consumer/resolved entry/digest，并保留 candidate-owned dependency closure 检查。
- **Case 路径批量更新丢失证明语义。** 使用 `test-evidence-review`，迁移前后运行完整 closure；只改 Owner/Proves path 时保持 Case 目的不变，真实语义变化另行审阅。
- **旧 active Plans 与新路径漂移。** 只审阅当前 active artifacts，建立受影响清单；archive 不改，未来恢复陈旧 Plan 时仍按 Change 距离重新基线。
- **首次发布被结构整理无限推迟。** 本 Change 不吸收 release legal/registry 工作或可选逻辑重构，以目标目录、路径闭合、行为对照和 full Gate 作为固定出口。

## Open Questions

无。Readiness ledger 已为 322 个 current 路径固定 action、target、owner、内容处理与验证；唯一获准的 `index.ts` target 是 `src/index.ts`，approved public exports 不改名。实施若发现 ledger 外 consumer、需要新的一级 owner、public rename、额外 `index.ts` 例外或新的 split/delete 依据，必须命中下述 stop condition，而不是现场补名或扩大范围。

## Execution Contract

### Accepted Readiness outputs

Readiness 已在本 Change 下形成以下可交接 artifacts；它们共同构成任务 1.1 的输入，不以聊天结论替代：

| Artifact | 内容 | 完成条件 |
| --- | --- | --- |
| `readiness/baseline-evidence.md` | 基线 commit、命令、运行环境、退出状态、关键 inventory/digest、失败归因与可复核输出路径 | public API/type、machine v4、candidate、quality、Gate、Test Evidence 和 full workspace 基线均有结果；大型或敏感日志不复制进 Change。 |
| `readiness/layout-naming-ledger.json` | 每个 current source/test/config/doc/Case 的唯一 source-to-target 结果 | 通过相邻 `layout-naming-ledger.schema.json`；没有遗漏、重复 source、未解释 delete/split 或未决名称。 |
| `readiness/layout-naming-ledger.schema.json` | Ledger 的字段、枚举和条件约束 | 能拒绝缺失 target、delete 仍有 target、未附证据的名称例外等非法条目。 |
| `readiness/active-change-impact.md` | 每个受影响 active Change 的 current-path 引用及 `update`、`defer` 或 `not-applicable` 处理 | 只更新仍影响未来实施的 handoff；陈旧基线、archive 和历史叙述不机械改写。 |

Ledger 顶层固定 `schemaVersion`、`baselineCommit` 与 `entries`。每项包含 `sourcePath`、`kind`、`action`、`targetPaths`、`targetOwners`、`primaryExports`、`nameRationale`、`nameException`、`contentDisposition`、`consumers` 与 `verification`。`action` 只能是 `move`、`rename`、`move-and-rename`、`split`、`delete` 或 `unchanged`；`delete` 的 `targetPaths` 为空，`split` 可以有多个 target，其余非 delete action 必须有唯一 target。`nameException` 默认为 `null`；非空时必须写明 exception kind、external requirement、永久 owner 与验证。

### Implementation start gate

以下条件已经全部满足；本 Plan snapshot 提交后从任务 1.1 开始：

1. 0.4–0.6 全部完成，三个 Readiness handoff artifacts 与 ledger schema 可读取且相互一致。
2. 每个 baseline failure 都已区分为当前既有失败或本 Change 阻断；没有未归因失败。既有失败只有在仍能提供迁移前后对照时才可接受。
3. Ledger 覆盖全部 tracked current consumer，并且没有未决一级 owner、public export rename、额外 `index.ts` 例外或 delete 依据。
4. 实施批次、每批 focused verification 和回退边界已在 `active-change-impact.md` 或 ledger 中明确。

### Batch order and stop conditions

实施按 Product public entry/definition、Product checks/facts/run/publication/scheduler、scripts shared capabilities、private project consumer、package artifact/candidate、current docs/tests/Case handoff 的依赖顺序推进。每批只包含一个 owner cluster 的 move/rename 与直接消费者同步；批次结束时必须恢复 typecheck 和最窄 owner tests，不能把跨批次破损留给最后 full Gate。

出现以下任一情况立即停在当前批次并修订 Decision/Change或取得对应 owner 判断：

- 需要改变 approved public runtime/type inventory、machine schema、scanner/Run/Gate 语义或除临时 CLI diagnostic 外的行为；
- 需要改变目标一级 owner、建立新的共享层、增加 `index.ts` 例外或让 package 反向消费 project；
- 同一 source 在 ledger 中需要两个互斥 owner，或无法用单一职责名称表达而 split 又没有独立变化/验证依据；
- exact candidate、isolated consumer 或迁移前后行为对照无法证明等价；
- 需要 registry、credential、正式版本、license material 或其它未授权外部发布操作。

## AI Consumption Contract

- **目标使用者：** 只获得当前项目指令、Navigation、Decision 与本 Change artifacts 的 Codex implementer/reviewer。
- **预期操作：** 先读取 `readiness/baseline-evidence.md`、`readiness/layout-naming-ledger.json` 及 schema、`readiness/active-change-impact.md`，再从任务 1.1 按 batch order 执行 owner move/rename、path/name sync、Case closure 与行为对照。不得从目标树或命名规则推断未声明的产品重构、public rename 或发布授权。
- **可观察完成结果：** AI 能为任一 current file 从 ledger恢复唯一 action/target/验证，为任一名称例外找到永久 owner和证据，并在触发 stop condition 时暂停；最终 Success Criteria 全部有直接命令或 artifact证据。
- **外部依赖：** CodeGraph 索引可用于发现 imports，但 ledger completeness 必须由 tracked path/import/config/doc registry检查证明，不能把索引可用性当作完整性证据；registry、credential与发布状态不在本 Change上下文。
