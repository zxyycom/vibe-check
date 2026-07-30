本 delta spec 定义 Vibe Check 完整 Bun 测试实体与语义 Case 的目标证据链。Spec 本身不证明实现状态；实现状态以 tasks、代码和验证证据为准。

## ADDED Requirements

### Requirement: 完整当前树生成 Bun 测试实体
项目 MUST 从版本化 runner profile 覆盖的完整当前树发现 Bun 能稳定独立报告且拥有完整测试意图的最小测试实体，并 MUST 在内存中闭合静态声明、JUnit runtime report 与实体映射。每个测试实体 MUST 具有唯一、确定性的 entity key；扫描结果 MUST NOT 通过手写 Entry 或 committed inventory 成为第二事实源。

#### Scenario: Static 与 runtime 集合闭合
- **WHEN** strict check 执行受支持 Bun runner profile
- **THEN** scanner 双向比较 static declaration 与 runtime report 并生成唯一当前实体集合
- **THEN** 任一 static-only、runtime-only、unsupported shape 或 duplicate entity 都阻断检查

#### Scenario: 聚合与内部环节不是实体
- **WHEN** 文件、suite、fixture、helper、mock、hook、断言、参数数据行或测试步骤只聚合或服务原生测试节点
- **THEN** scanner 只为可独立报告且意图完整的最小原生 test / it 节点生成 entity key
- **THEN** 聚合与内部环节不得获得独立实体

#### Scenario: 工程校验不是测试实体
- **WHEN** lint、类型检查、schema、build、质量扫描或 CI job 只执行工程校验
- **THEN** 工程校验继续由自身 owner 与验证链路承接
- **THEN** Case 账本不得把命令、job 或检查结果登记为测试实体

### Requirement: Topic 文件直接拥有语义 Case
项目 MUST 固定使用 `docs/testing/cases/topics.json` 定义稳定 topic ID、说明和顺序，并 MUST 让每个受控 topic 恰有一个 `docs/testing/cases/<topic>.md` 保存零个或多个当前 Case。Case root、topic catalog、受控和未知 Markdown 成员 MUST 保持 workspace-safe、regular、no-symlink；Case ID MUST 全局唯一且稳定。项目 MUST NOT 维护一 Case 一文件目录或重复 Case/entity 关系的 committed query index。

#### Scenario: 空 topic 稳定存在
- **WHEN** 一个受控 topic 暂时没有 Case
- **THEN** topic catalog 与对应 H1-only Markdown 仍定义合法空 topic
- **THEN** topics 查询返回该 topic且 strict check 不因它为空而失败

#### Scenario: Case source 边界
- **WHEN** Case root、topic catalog 或 Markdown 成员越出 workspace、经过符号链接、类型非法、缺失、未知或位于嵌套目录
- **THEN** strict check 报告阻断诊断
- **THEN** 查询不得用缓存、兼容读取或忽略非法 Markdown 绕过诊断

#### Scenario: Topic Markdown 使用受控语法
- **WHEN** parser 读取受控 topic Markdown
- **THEN** 文件只接受同名 H1、空行和合法 `## Case <CASE-ID>: <title>` blocks
- **THEN** malformed Case heading、其它 H2 或 Case block 外 prose 都产生阻断诊断

### Requirement: Case 表达 Owner、证明与当前实体
账本 MUST 只保存当前 implemented Case。每个 Case MUST 恰好声明一个精确定位当前 Markdown heading 的 `Owner`、非空 `Entities` 和非空 `Proves`；Owner MUST 真正拥有全部证明责任，每条 `Proves` MUST 描述该 Owner 下责任方可观察且可证伪的判断，每个 entity key MUST 完整来自当前 scanner。Case ID MUST 跟随语义目的并且退休后不得换义复用。Case MUST NOT 保存 Status、Entry、Contract、source fingerprint、Code path、Verification、marker 或派生反向引用。

#### Scenario: Case 关联当前直接证据
- **WHEN** 维护者登记一个当前 Case
- **THEN** Entities 至少包含一个能够直接产生该 Proves 信号的当前测试实体
- **THEN** Owner heading 存在并拥有全部 Proves 所述契约

#### Scenario: Planned 行为不进入账本
- **WHEN** 一个行为仍是 planned 或没有当前直接测试实体
- **THEN** 行为留在 owner、OpenSpec 或其它规划材料
- **THEN** Case 账本不得用 Status、空 Entities 或名义测试建立占位

#### Scenario: 无法形成语义的测试实体
- **WHEN** 一个当前测试实体只能产生复述测试名称、AST match 或“测试稳定契约”的模板 Case
- **THEN** 维护者必须重审其真实 owner 目的并合并、删除或重新归类测试
- **THEN** 不得生成模板 Case 只为消除 coverage diagnostic

### Requirement: 当前测试实体与 Case 双向覆盖
严格检查 MUST 计算当前测试实体与 Case 的 many-to-many 关系，并 MUST 保证每个当前测试实体至少属于一个 Case、每个 Case 至少引用一个当前测试实体。项目 MUST 允许同一实体支持多个 Case、同一 Case 由多个实体支持，并 MUST NOT 强制一对一映射。

#### Scenario: 当前实体没有语义 Case
- **WHEN** scanner 返回的当前实体未被任何 Case 精确列举
- **THEN** strict check 报告 uncovered entity 并失败
- **THEN** 维护者按真实证明目的处理，而不是自动生成 Case

#### Scenario: Case 引用未知实体
- **WHEN** Case 的 entity key 不在当前 scanner 集合
- **THEN** strict check 报告 unknown entity 并失败
- **THEN** 维护者按 rename、move、delete、split 或 merge 的语义连续性更新 Case

#### Scenario: 实体与 Case 多对多
- **WHEN** 多个实体共同证明同一 owner 目的或一个实体直接观察多个独立 owner 结果
- **THEN** 对应 Case/entity 关系可以复用
- **THEN** strict check 以实体并集验证覆盖而不把合法复用诊断为重复

### Requirement: 测试结构和正文变化保持语义连续
项目 MUST 在新增、删除、重命名、移动、拆分、合并或修改测试正文时先恢复相关 Case 与 Owner，并 MUST 在修改前后运行完整 strict check。机械 identity 连续性 MUST NOT 代替对证明信号、可靠性和维护价值的语义复审。

#### Scenario: Rename 或 move
- **WHEN** 测试目的连续但 entity key 因名称、suite 或路径变化
- **THEN** Case ID 保持不变并更新 entity key
- **THEN** 旧 key 不能残留为未知实体且新 key 不能保持 uncovered

#### Scenario: Split、merge 或 delete
- **WHEN** 测试实体拆分、合并或删除
- **THEN** Case 按证明目的而非节点数量重新关联
- **THEN** 失去全部当前证据的 Case 必须删除、改写或关联真实替代实体

#### Scenario: 正文变化但 identity 不变
- **WHEN** 测试正文、断言、fixture 或 helper 变化而 entity key 不变
- **THEN** 维护者仍重读 Owner、Case 与可观察证明信号
- **THEN** strict closure 只证明身份和映射当前，不得被解释为语义仍然正确

### Requirement: 查询与 Required 门禁只使用当前证据链
项目 MUST 让 `topics`、有界 `list` 和单 Case `show` 直接读取 topic catalog 与 Case files，并 MUST 让 `check` 从完整 Bun scanner entity 集合与同一 Case source 执行严格验证。迁移完成后，旧一节点一文件目录、hand-written Entry、派生 index、`sync-index`、源码 marker 与兼容双读 MUST NOT 作为活跃验证或查询来源。

#### Scenario: 只读查询不生成派生状态
- **WHEN** 维护者按 topic、Owner、entity key 或文本执行有界 list，或按 Case ID show
- **THEN** 查询直接返回当前合法 Case source
- **THEN** 查询不运行 scanner、不写文件且不依赖 committed index

#### Scenario: Required profile 检查完整当前树
- **WHEN** 本地或 CI 运行 workspace required profile
- **THEN** test-evidence check 先证明 static/runtime/entity closure，再证明 Topic/Case 与实体覆盖
- **THEN** missing、unknown、duplicate、unsupported 或 malformed 状态使 required check 失败

#### Scenario: Runner 结果不被重复调度
- **WHEN** test-evidence check 已执行受支持的完整 Bun test surface
- **THEN** workspace full profile 复用该 required check 的结果
- **THEN** full profile 不再次调度相同 product 与 toolkit Bun tests
