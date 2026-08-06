# agent-workflows Specification

## Purpose

定义项目级 Codex agent workflow 的可验证边界：Skill 来源与本地例外、工具适配方向、未对齐
决策怎样影响当前任务，以及 OpenSpec change 的阶段门禁。完整分工分别由
`docs/script-tooling.md` 和 `docs/decision-and-change-governance.md` 拥有；本 spec 只保留 OpenSpec 需要验证的
requirements 和 scenarios。

## Requirements

### Requirement: Project skills remain traceable and local exceptions stay bounded

Repository SHALL 将明确选择的项目级 Codex skill 保存为 `.codex/skills/<name>/` 下的完整
上游分发单元。每个同步包 MUST 来自一个已核实的上游 release 或对应 commit，并 MUST
保留兑现该 skill 所需的 `SKILL.md`、references、scripts、declarations、schemas、
metadata 和 updater。只有项目方法层必须读取 Vibe Check-owned 治理语义，且当前 owner、
长期决策、精确文件边界与仓库验证入口均已建立时，Repository MAY 维护显式项目本地例外；
本地例外 MUST 保持在已登记的方法层文件内，工具 runtime、schema、索引、配置和产品行为
SHALL 继续由原 owner 承接。项目自有 wrapper、package scripts、文档路由和数据目录 MUST
位于 skill 分发目录之外。

#### Scenario: A selected skill is installed or updated

- **WHEN** 维护者新增或升级一个项目级 skill
- **THEN** 非例外文件与选定上游版本的正式分发内容一致
- **AND** 项目专属 root、命令和 owner 适配位于 skill 分发目录之外

#### Scenario: A registered method-layer exception is maintained

- **WHEN** 项目治理要求 skill 的 agent 指引使用更具体的决策、change 或测试证据语义
- **THEN** 例外文件、owner、理由和验证入口在项目文档与活动决策中可恢复
- **AND** 工具 runtime、schema、索引、配置和产品行为仍只有原 owner
- **AND** 后续上游同步先比较例外语义，并保持已登记的文件边界

#### Scenario: A skill package is validated

- **WHEN** 项目交付 skill 新增或更新
- **THEN** 每个受影响 skill 通过结构 validator 和内部链接检查
- **AND** 带运行脚本的 skill 至少执行其代表性 help、check 或目标事务

### Requirement: Tool-bearing skills use one-way project adapters

Repository SHALL 只在需要稳定项目命令或 workspace gate 时为随包工具提供
`scripts/**` 薄适配。适配器 MUST 显式传入 Vibe Check 仓库根、转发随包 CLI 或 ESM
结果，并 MUST NOT 复制解析、索引、生命周期、Schema 或诊断语义。`src/product/**`
MUST NOT 导入项目级 skill 或其适配器。

#### Scenario: A project command invokes a skill tool

- **WHEN** package script 调用决策记录或测试证据入口
- **THEN** 项目 wrapper 只解析仓库根并调用对应随包实现
- **AND** 退出状态、结构化结果和错误语义仍由 skill 分发单元拥有

#### Scenario: Product runtime imports are checked

- **WHEN** workspace 验证检查产品 import closure
- **THEN** `src/product/**` 不依赖 `.codex/skills/**` 或 `scripts/**` 开发工作流

### Requirement: Skill contract migrations converge on one current format

当 skill 升级改变其项目数据格式、索引或生命周期语义时，Repository SHALL 在同一受控
change 中迁移权威来源、项目适配、文档和验证入口。迁移 MUST 使用当前分发的确定性工具
生成派生数据，并 MUST 在交付状态删除旧 owner、旧索引、旧 marker 或双读兼容路径。

#### Scenario: Decision records change schema

- **WHEN** `decision-records` 升级要求新的领域、Markdown 或索引格式
- **THEN** 全部长期决策语义和可信建立时间被迁移到当前权威来源
- **AND** 最新严格 check、list 和代表性 show 能恢复同一判断

#### Scenario: Test evidence changes catalog model

- **WHEN** `test-evidence-review` 取代聚合账本与源码 marker
- **THEN** 每个保留的最小原生测试入口由唯一当前 case 承接
- **AND** 旧账本、marker、采集或专用格式 validator 不再作为并行 owner

### Requirement: Unaligned decisions guide within current task scope

Agent workflow SHALL 将 `active + unaligned` 决策解释为已经确认但尚待未来实现的方向。相关
工作 SHALL 在完整满足当前任务的可行方案中优先保留通向该方向的路径；当前任务 MUST 继续
提供实施范围和优先级，`alignment` 只记录方向与当前事实的关系。

#### Scenario: An unaligned direction applies to a bounded task

- **WHEN** 当前任务与一条活动未对齐决策相关，且实施目标保持有界
- **THEN** agent 在完整满足当前任务的方案中优先选择保留未来演进路径的方案
- **AND** 实施内容与当前任务明确要求一致

### Requirement: Change detail serves its current phase

OpenSpec change SHALL 保存当前阶段用于判断或执行的信息。探索阶段 SHALL 保留恢复方向所需
的目标、范围与非目标、关键边界、依赖、风险、证据、开放问题、启动条件和高层验收方向；
进入实施准备后 SHALL 根据届时基线补足设计、任务和验收依据。暂停后的详细 artifacts SHALL
保留审计上下文，并在恢复时根据当前 owner、活动决策和实现状态更新仍需使用的内容。OpenSpec
artifact 状态只表示工具要求的文件是否完备；实现 SHALL 在当前任务授权、开放问题收敛、
artifacts 与当前事实一致且阻塞级审计完成后开始。

#### Scenario: An exploratory change remains in exploration

- **WHEN** 一个 change 处于探索阶段
- **THEN** artifacts 保留判断方向与启动条件所需的信息
- **AND** 实现细节在进入实施准备后根据届时事实形成

#### Scenario: A change enters implementation preparation

- **WHEN** 当前请求要求把已经收敛的 change 准备为可实施提案
- **THEN** artifacts 根据当前 owner、活动决策和实现状态补足设计、任务与验收依据
- **AND** `tasks` 在实现任务前提供阻塞级审计门禁
- **AND** 实现从阻塞级审计完成后开始

#### Scenario: A paused detailed change resumes

- **WHEN** 已经形成详细 artifacts 的 change 在暂停后恢复
- **THEN** 原 artifacts 继续作为形成时审计上下文
- **AND** 实施前根据当前基线、活动决策和实现状态更新仍需使用的内容
