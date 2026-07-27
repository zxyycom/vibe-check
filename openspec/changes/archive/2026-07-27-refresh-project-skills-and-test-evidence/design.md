本设计把 skill 分发同步、决策记录升级和测试证据迁移组织成依次可验证的单轨切换；当前文件只形成待审计计划，不代表已经应用到项目。

## Context

- `.codex/skills` 当前包含 15 个项目级 skill；用户已经明确选择更新 4 个 OpenSpec
  skill，并新增 5 个工程判断/报告 skill。
- `decision-records` 已通过项目 wrapper 接入，但最新上游版本改变了 Markdown、领域目录和
  索引模型。当前集合只有 1 条活动决策，适合一次性迁移而不维护双读。
- 测试 owner 当前由 `docs/testing/cases.md` 与源码 `@case` marker 共同表达；迁移审计
  确认 30 个聚合 ledger case、31 个 marker 注释和 173 个 Bun 原生测试入口。既有 docs
  validator 只负责通用文档材料，不校验 marker 对应关系。最新 `test-evidence-review`
  要求固定目录、受控 topic 和一原生入口一 case。
- 上游 release `20260727T030324Z-17ebf93ef2dd` 与所检查的 main commit
  `f3d07c5a4be70253b1c28da25830af1d044d4df9` 一致。Skill 包包含正文、引用、确定性
  CLI、声明、source map 和 updater，不能只复制 `SKILL.md`。

## Goals / Non-Goals

**Goals:**

- 将用户点名的 skill 作为完整上游分发单元同步到项目，并保留项目自有集成在 skill
  目录之外。
- 让决策记录和测试证据都只有一份当前权威源，并能由随包 CLI 严格检查和重建派生索引。
- 把旧测试账本中的稳定契约语义迁移到每个真实原生测试入口，删除聚合 marker 模型。
- 让 package scripts、docs validation 和 workspace verification 覆盖新的开发工作流。

**Non-Goals:**

- 不更新用户没有点名的其它上游 skill。
- 不改变 `src/product/**` 的产品行为、测试断言或测试入口粒度；只有现有测试本身混合多个
  独立意图且无法形成合法 case 时才另行报告，不借迁移重构测试。
- 不保留旧/新决策或测试证据格式的双读兼容层。
- 不发布、提交、推送或修改远端仓库。

## Decisions

### 1. 按完整 release 分发单元同步

- 采用：从已核实 release 对应 commit 原样复制每个选定 `skills/<name>/` 目录。
- 采用：更新 `openspec-apply-change`、`openspec-archive-change`、`openspec-explore`、
  `openspec-propose`；新增 `product-architecture-judgment`、
  `dependency-boundary-design`、`common-denominator-design`、
  `minimal-implementation`、`investigation-report`。
- 采用：后续再完整同步 `decision-records` 和 `test-evidence-review`，使包内 updater、
  声明、Schema 与 CLI 保持同版本。
- 不采用：只复制 `SKILL.md` 或从不同 commit 拼接文件；这会破坏分发完整性和后续更新。

### 2. 决策记录使用一次性当前格式迁移

- 采用：建立 `workflow-policy` 与 `testing` 领域目录表；把现有记录改为 frontmatter
  自包含格式，保留其语义、活动状态和最早可信建立时间。
- 采用：现有“采用项目级长期决策记录”已经与当前事实一致，迁移后标记
  `active + aligned`。
- 采用：完成本 change 后分别记录项目 skill 组合和测试证据 owner 的长期判断，并在事实
  核对后建立为 aligned 基线。
- 采用：索引只由最新 CLI 生成；不手工转换旧 JSON 字段，也不保留旧 schema。

### 3. 测试证据按真实原生入口重新建账

- 采用：固定 `docs/test-evidence`，由 `test-evidence-topics.json` 定义与项目稳定测试
  owner 对应的 topic。
- 采用：每个 Bun `test(...)` / `it(...)` 原生报告节点独占一个 case 文件；case 的
  `Entry` 使用文件路径、完整 suite/test 名和可精确选择的 Bun 命令。
- 采用：先生成“旧 case/marker → 实际测试入口 → 新 topic/case ID”的迁移清单，保留旧
  case 中仍成立的 Contract/Proves，并为拆出的入口分配稳定新 ID。
- 采用：迁移完成后删除 `docs/testing/cases.md` 与 Vibe Check-owned 源码 `@case`
  marker；审计确认项目原本没有专用 marker validator，因此不新增兼容实现。Pinned
  toolkit submodule 中由外部 revision 拥有的历史注释不作为项目证据输入；
  `docs/testing/case-maintenance.md` 改为新目录的项目级维护说明，不复制随包固定契约。
- 不采用：让新 CLI 扫描源码或自动注册 case；源码入口与 case 的一一对应由迁移审计和
  后续测试修改流程保证。

### 4. 项目入口保持薄适配

- 采用：`scripts/decision-records.ts` 和新增的测试证据 wrapper 只注入仓库根并转发随包
  ESM API；产品 runtime 不导入这些开发工具。
- 采用：package scripts 提供常用 list/check/完整 CLI 入口；workspace required verifier
  至少执行两个严格 check。
- 采用：docs validator 继续只负责普通 Markdown/链接等既有文档责任，不新增测试证据
  parser；目录格式由随包 CLI 严格检查。

### 5. 验证以迁移等价和当前契约为出口

- Skill：全部本地 skill 通过随包 `validate-skill.mjs`，选定包与上游源目录逐文件一致。
- Decision：迁移前保存旧记录语义投影，迁移后严格 `check` 并核对 list/show。
- Test evidence：迁移前后核对测试入口集合、旧 case 语义映射、新 case ID 唯一性和 case
  数量；运行索引同步、严格 check、代表性 query/show 和全部受影响测试。
- Workspace：运行 docs、OpenSpec、scripts typecheck/lint、product tests 和 required
  workspace verifier；大范围迁移通过后再决定是否需要 full verifier。

## Risks / Trade-offs

- **[Decision schema 不兼容]** → 在替换包前保存旧语义与建立时间证据；替换后一次性写完
  权威来源并只由新 CLI 生成索引。
- **[聚合 case 拆分产生错误语义]** → 先以 runner 原生节点生成清单，再逐文件从测试名、
  断言和 owner 文档恢复 Contract/Proves；缺少依据的入口不从旧概括猜测。
- **[大量 case 文件造成审阅噪声]** → 使用确定性生成/检查脚本完成机械骨架，再对唯一性、
  入口集合和代表性正文做人工审阅；最终脚本不成为长期事实源。
- **[skill 包包含较大生成产物]** → 保留完整 release 分发以换取可独立运行和可更新性；
  不把 source map 载入日常上下文。
- **[重复 validator 演进为双轨]** → 不在 docs validator 增加 marker 或 case parser，
  目录格式只由随包 CLI 检查。

## Migration Plan

1. 创建并审计本 change；在任何实现任务前完成阻塞级审计任务。
2. 同步 4 个 OpenSpec skill 和 5 个新增 skill，逐包结构校验并确认 diff。
3. 同步 `decision-records`，迁移领域目录、现有 Markdown 和索引；更新 wrapper/types/docs，
   运行严格 check。
4. 同步 `test-evidence-review`，生成测试入口与旧账本映射，建立 topic、单 case 文件和
   派生索引。
5. 切换 wrapper、package scripts、workspace verifier、testing 文档和 OpenSpec
   `test-fixtures` 契约，确认 docs validator 无专用 marker 逻辑，再删除旧账本与项目自有
   marker。
6. 写入并建立两项已确认长期决策，运行决策和测试证据严格检查。
7. 运行项目验证并审查最终 diff；任一步失败时通过 Git 工作树恢复该阶段前文件组合，
   不留下新旧格式并存的交付状态。

## Open Questions

无。用户已明确选择更新、新增与迁移范围；实现细节按当前项目 owner 和上游固定契约执行。
