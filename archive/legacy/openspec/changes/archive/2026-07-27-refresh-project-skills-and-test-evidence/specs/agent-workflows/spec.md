本 delta 新增项目级 agent workflow 的分发与迁移契约。

## ADDED Requirements

### Requirement: Project skills remain complete and traceable

Repository SHALL 将明确选择的项目级 Codex skill 保存为 `.codex/skills/<name>/` 下的完整
上游分发单元。每个同步包 MUST 来自一个已核实的上游 release 或对应 commit，并 MUST
保留兑现该 skill 所需的 `SKILL.md`、references、scripts、declarations、schemas、
metadata 和 updater。项目自有 wrapper、package scripts、文档路由和数据目录 MUST 位于
skill 分发目录之外。

#### Scenario: A selected skill is installed or updated

- **WHEN** 维护者新增或升级一个项目级 skill
- **THEN** skill 目录与选定上游版本的正式分发内容一致
- **AND** 项目专属 root、命令或 owner 适配不会写入上游分发目录

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
