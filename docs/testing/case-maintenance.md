# 测试证据维护

修改或审查测试时，先用[测试策略](strategy.md)判断自动化证明义务，再读取行为 owner，最后按本文维护语义账本。
本文定义 Topic、Case、当前测试实体及其存储、查询和闭合规则；[test-evidence 工具](../../scripts/test-evidence/)负责实现，
[评审 skill](../../.codex/skills/test-evidence-review/SKILL.md)提供通用审查方法。

```text
Topic（有界查询分类）groups -> Semantic Case（一项稳定的当前测试目的）
Semantic Case.Owner          -> 当前行为 owner heading
Semantic Case.Entities       -> 一个或多个 current test entities
```

## 核心对象

- **Case：** 一组实体共同证明的一项当前目的。必须有全局唯一且稳定的 ID、一个 topic、一个真正拥有全部 `Proves` 的当前 owner heading、至少一个当前实体和一条可证伪的 `Proves`。ID 随目的而不随机械函数名变化，删除或退休后也不得复用于其它语义。
- **当前测试实体：** runner profile 从源码静态发现、由 Bun registration JUnit report 独立报告的可寻址节点，使用工具给出的完整 entity key。实体不手写或持久化为第二套账本，不承担长期语义。
- **Topic：** 稳定的有界查询分类，每个受控 topic 对应同名 Markdown 文件；不随单个 Case 增删而消失，也不拥有产品契约、优先级或替代 `Owner`。

事实来源各司其职：行为 owner 定义契约；源码和 Bun report 证明实体存在与 runner 身份；
[`topics.json`](cases/topics.json) 只拥有 topic ID、说明和顺序；`cases/<topic>.md` 拥有 Case 语义和实体映射。
工具只发现与验证，不提交派生实体清单、查询索引或其它语义副本。

参数矩阵数据行、fixture、helper、hook、mock、断言和步骤不是独立对象；lint、类型检查、schema、build、quality scan 和 CI job 是工程校验，不因进入验证链成为测试实体。

## Case 粒度

Case 按 owner 契约与可观察结果划分，不按 runner 数量、Gate lane、执行 DAG 或性能特征划分：

- 多个变体、层级或入口证明同一目的时归入一个 Case；一个实体直接观察多个独立目的时可以映射多个 Case。
- 只有 owner requirement 或可观察失败信号不同才拆 Case；不能为入账本而拆测试。同一 setup、action、assertion shape 的输入变体优先放在稳定入口的参数矩阵。
- 无法归入有意义 Case 的实体应合并、删除，或确认其属于工程校验；不能用测试名、AST match 或“测试稳定契约”等模板填缺口。

`Owner` 指向完整规则；`Proves` 只描述可由本 Case 失败信号判定的行为，不复制完整契约。

## 存储格式

`docs/testing/cases/topics.json` 是版本化 topic 表。每项 topic 有非空说明和同名 `cases/<topic>.md`：

- cases root 必须是 workspace 内的非符号链接目录；`topics.json`、受控 topic 和未知 `.md` 成员都须是 workspace 内的非符号链接普通文件。
- 嵌套目录、任何符号链接、未登记的 `.md`、缺失的受控文件均阻断解析；无关非 Markdown 普通文件被忽略。
- topic 只允许同名 H1、空行和合法 `## Case <CASE-ID>: <title>` blocks。仅 H1 是合法空 topic；malformed Case H2、其它 H2 或 block 外正文均阻断解析。

以下仅为格式示例；写入时替换尖括号内容并使用实际可发现的 entity key：

```markdown
# <topic>

## Case <CASE-ID>: <title>

Owner: `<relative-current-owner.md#heading>`
Entities:

- `bun|<workspace-relative-test-file>|<current test name>`
  Proves:
- <owner 承诺且可由该实体证伪的当前行为>
```

字段顺序固定为 `Owner`、`Entities`、`Proves`。`Owner` 必须是当前 workspace 内可解析的相对 `.md#heading`，
`Entities` 使用工具报告的完整 key，不允许通配符。Case 标题、ID、owner 和 `Proves` 由维护者审查，不能从测试名或 AST 自动生成。

## 当前与历史边界

账本只保存当前直接实体支持的 implemented Case。历史只用于迁移审计、风险识别和代表输入选择，不创建当前 Case、实体或测试义务，也不参与 `check` 覆盖计算。

生产能力仍存在但缺少直接测试，不是映射缺口；是否补测试按[测试所有权](strategy.md#测试所有权)另行评估。
尚无直接证据的意图留在行为 owner、活动决策或 active Change，不创建空/名义 Case、`Status`、空映射或为迁移反向补测试。

## 全树闭合

[runner profile](../../scripts/test-evidence/supported-runner-profile.json) 用 `scripts/**` 与 `src/**` 目录规则定义完整 Bun test surface。
静态发现与 runtime registration 复用同一文件集合；registration child 用专用不匹配 test-name pattern 加载全树，
要求每个 testcase 明确 skipped，并报告 file、line、suite 和 name。

严格 `check` 每次重新发现完整当前树，不用 Git diff、缓存或历史缩小范围，并验证：

1. 规范化静态集合与 Bun JUnit registration 集合完全相等。
2. 每个实体至少有一个 Case；每个 Case 至少引用一个当前实体，且没有未知实体。
3. Case ID、topic、文件、owner 引用与字段结构有效且无重复。

`static-only`、`runtime-only`、duplicate、unsupported、未知实体、无 Case 实体或不可解析 Case 均阻断。
闭合使用全部 Case 的实体并集，不要求一对一。

闭合只证明存在和映射合法，不证明正文通过或 `Proves` 与断言一致。实际行为由最窄测试或[Gate](../tooling/project-gate.md)的独立 execution Checks 证明；
Gate 拥有 membership、provider dependency、tag 与 scheduling。正文即使没改 entity key，也须重读 Case 和 owner。

## 修改流程

测试新增、正文修改、删除、rename/move、split/merge，或 runner profile、静态规则、JUnit report、身份归一变化时：

1. 从[导航](../navigation.md#如何阅读这些文档)读取策略、行为 owner 和本文，需要时读评审 skill。
2. 先运行完整 `check`；既有阻断须按事实源定位，不归因于本次 diff。
3. 用 `topics`、有界 `list`、`show` 定位 Case；按实体使用 `list --entity-key`。
4. 写清“owner 承诺 → 可观察结果”，再复用、修改或新增 Case；只有出现稳定新查询分类才扩展 topic。
5. 修改测试与映射，运行最窄目标测试，再运行完整 `check` 和范围匹配的 workspace verification。

结构变化按语义连续性处理：

| 变化 | 账本动作 |
| --- | --- |
| rename / move | 目的连续时保留 Case ID，只更新 entity key。 |
| split | 新实体归入原目的；目的也分裂时才拆 Case。 |
| merge | 实体合并不自动合并 Case；合并实体可以支持多个目的。 |
| delete | 从所有 Case 移除实体；失去证据的 Case 删除、改写或重新关联。 |
| 正文变化 | key 未变也重审 owner、证明信号、可靠性与维护价值。 |

若自动化需要复制实现、增加测试专用接口或高成本脆弱环境，在 owner 或 Change 记录 `Manual CR:`、审查对象与判定条件，不创建空测试或名义 Case。

## 查询与验证

从仓库根目录运行：

```bash
bun run test-evidence -- topics --root .
bun run test-evidence -- list --topic <topic> --root .
bun run test-evidence -- list --entity-key <entity-key> --root .
bun run test-evidence -- list --owner-ref <docs/path.md#heading> --root .
bun run test-evidence -- list --query <text> --limit <1-100> --offset <n> --root .
bun run test-evidence -- show <CASE-ID> --root .
bun run test-evidence -- check --root .
```

`topics`、`list`、`show` 只读 Case 目录并输出 JSON；精确 ID 只通过 `show` 查询。`check` 额外注册完整测试面但不执行正文。
查询不写文件，没有需要同步的派生制品。

按 diagnostic origin 修复对应事实源：

- `profile` / `static`：profile、路径边界、ast-grep 规则或不支持的注册形态。
- `runner`：registration、JUnit、static/runtime mismatch 或实体身份。
- `case`：topic、Markdown、Owner、映射或 coverage；未知实体须审查语义连续性，未映射实体须判断真实目的。
- `query`：参数、筛选或 Case ID。

不要用生成模板 Case、恢复历史清单或新增名义测试消除诊断。

## 交付审计

确认全树闭合、Case 目的与真实断言一致、结构变化保持语义连续，且最窄行为测试与范围匹配的 Gate 通过。
账本不增加 Entry、Contract、Status、marker、committed inventory/index 或兼容双读；机械通过不能代替语义审查。
