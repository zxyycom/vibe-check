# 测试证据维护

本文是 Vibe Check 语义测试账本的项目级 owner。它完整定义 Topic、语义 Case、当前
测试实体之间的关系，以及账本的存储、查询、修改和闭合失败边界。修改或审查测试时，
先读[测试策略](../testing.md)选择层级并判断自动化测试义务，再读相关行为 owner
确认当前契约，最后按本文维护账本。

[`scripts/test-evidence/`](../../scripts/test-evidence/) 实现 runner profile、实体发现、
目录解析与严格检查。项目级
[`test-evidence-review` skill](../../.codex/skills/test-evidence-review/SKILL.md)
只在这些项目规则之上提供通用评审方法。

账本使用以下关系：

```text
Topic（有界查询分类）groups -> Semantic Case（一项稳定的当前测试目的）
Semantic Case.Owner          -> 当前行为 owner heading
Semantic Case.Entities       -> 一个或多个 current test entities
```

权威来源按责任划分：

1. `Owner` 指向的当前行为文档拥有 `Proves` 所依据的产品或工程契约。
2. 当前源码和 Bun JUnit report 拥有测试实体的存在性与 runner 身份事实。
3. [`cases/topics.json`](cases/topics.json) 只拥有受控 topic 的 ID、说明和顺序。
4. `cases/<topic>.md` 拥有当前 Case 的语义及 Case 与实体的映射。
5. test-evidence 工具只发现和校验这些来源，不提交派生实体清单、查询索引或其它语义副本。

## 核心对象

**Case** 是人工维护的语义单元，说明一组测试实体共同证明什么。每个 Case 必须有全局
唯一且稳定的 ID、一个 topic、一个当前 owner heading、至少一个当前实体和至少一条
可证伪的 `Proves`。Case ID 跟随测试目的，不随机械函数名变化；Case 删除或退休后，
该 ID 也不得换作其它语义。`Owner` 必须真正拥有全部 `Proves` 所述契约，不是相关文档、
测试文件或 topic 的代称。

**当前测试实体** 是受支持 runner profile 能从源码静态发现、并由 Bun JUnit report
独立报告的可寻址节点。它使用确定性的完整 entity key；实体不手写、不持久化为第二套
账本，也不承担长期语义。

**Topic** 只提供稳定的有界查询分类。每个受控 topic 对应一个同名 Markdown 文件，
文件内可以保存多个 Case；topic 不随单个 Case 的增删自动消失，也不拥有产品契约、
表示优先级或替代 Case 的 `Owner`。

参数矩阵中的数据行、fixture、helper、hook、mock、断言和测试步骤不是独立账本对象。
lint、类型检查、schema、build、quality scan 和 CI job 属于工程校验，不因进入验证链
就成为测试实体。

## Case 粒度

Case 按 owner 契约与可观察结果划分，不按 runner 节点数量划分：

- 多个输入变体、多个层级或多个入口实体证明同一目的时，归入一个 Case。
- 一个实体确实观察多个独立目的时，可以关联多个 Case。
- 只有 owner requirement 或可观察失败信号不同，才拆分 Case。
- 不得为了让代码能单独进入账本而拆测试；同一 setup、action 和 assertion shape 的
  输入变体优先留在一个稳定命名入口的参数矩阵中。
- 无法归入有意义 Case 的实体，应合并、删除，或确认它其实属于工程校验；不得用复述
  测试名、AST match 或“测试稳定契约”的模板 Case 填补缺口。

Case 不是完整契约文档。`Owner` 指向完整规则，`Proves` 只记录本 Case 能从失败信号中
判定的行为。历史事故或旧账本可以帮助选择代表输入，但不能单独制造 Case 或断言。

## 存储格式

`docs/testing/cases/topics.json` 是版本化 topic 表。每个 topic 必须有非空说明，并有一个
`docs/testing/cases/<topic>.md` 文件。topic 文件以同名 H1 开始，每个 H2 block 保存
一个 Case：

- `docs/testing/cases/` 必须解析为 workspace 内的非符号链接目录；
  `topics.json`、受控 topic 文件和未知 `.md` 成员都必须解析为 workspace 内的非符号
  链接普通文件。
- cases root 中的嵌套目录、任意符号链接、未在 `topics.json` 登记的 `.md` 文件和缺失
  的受控 topic 文件都会阻断解析；无关的非 Markdown 普通文件被忽略。
- topic Markdown 只允许同名 H1、空行和合法
  `## Case <CASE-ID>: <title>` blocks。仅含 H1 的文件表示合法空 topic；malformed
  Case H2、其它 H2 或 Case block 外正文都会阻断解析。

```markdown
# quality-gate

## Case WB-METRICS-GATE-EVALUATOR-001: Product gate evaluation 稳定
Owner: `docs/quality-metrics.md#gate-policy-and-evaluation`
Entities:
- `bun|src/product/quality-core/src/model/gate-evaluator.test.ts|gate evaluator prerequisites > applies the fixed disabled, completeness, and comparison priority`
Proves:
- Disabled、completeness failure 与 comparison unavailable 使用固定 prerequisite priority。
```

字段顺序固定为 `Owner`、`Entities`、`Proves`，避免解析结果依赖启发式推断。
`Owner` 必须是当前 workspace 内可解析的相对 `.md#heading` 引用；`Entities` 使用
test-evidence 工具报告的完整 key，不允许通配符。Case 标题、ID、owner 和 `Proves`
由维护者审查，不能从测试名或 AST 自动生成。

## 当前与历史边界

账本只保存有当前直接测试实体支持的 implemented Case。Git 历史、历史计划材料、
旧账本或事故记录只用于迁移审计、风险识别和代表输入选择；它们不创建当前 Case、
当前实体或产品测试义务，也不参与 `check` 的当前覆盖计算。

历史语义对应的生产能力仍存在、但当前没有直接测试实体时，这不是 Case 映射缺口。
是否新增产品测试按[测试策略的测试所有权](../testing.md#测试所有权)在独立 change 中
评估；在形成当前直接证据前，不创建空 Case、名义 Case 或为迁移反向补测试。

尚无当前实体的 planned test intention 留在行为 owner、活动决策或 active Change Plan，
不在 Case 文档中增加 `Status` 或空映射。

## 全树闭合

版本化 runner profile 位于
[`scripts/test-evidence/supported-runner-profile.json`](../../scripts/test-evidence/supported-runner-profile.json)。
它用 `scripts/**` 与 `src/product/**` 的目录规则定义当前受支持 Bun test surface；
静态发现与 runtime report 必须复用同一文件集合。

严格 `check` 总是从完整当前树重新发现，不使用 Git diff、缓存清单或历史账本作为发现
范围，并验证：

1. 规范化后的静态实体集合与 Bun JUnit runtime 集合完全相等。
2. 每个当前实体至少被一个 Case 引用。
3. 每个 Case 至少引用一个当前实体，且不引用未知实体。
4. Case ID、topic、topic 文件、owner 引用和字段结构有效且无重复。

`static-only`、`runtime-only`、duplicate、unsupported、未知实体、无 Case 实体和无法
解析的 Case 都是阻断错误。一个实体可以映射到多个 Case，因此闭合比较使用所有 Case
的实体并集，不要求一对一。

按诊断所属事实源修复：static/runtime 不一致先检查当前源码、runner profile 和发现规则；
目录、字段、owner 或重复 ID 诊断修复 Case source；未映射的当前实体需要判断其真实测试
目的；Case 引用未知实体时重审实体变化与 Case 连续性。不得用生成模板 Case、恢复历史
清单或新增名义测试来消除诊断。

闭合只能证明实体存在和映射合法，不能机械证明 `Proves` 仍与断言一致。测试正文变化但
entity key 不变时，维护者仍必须重读相关 Case 和 owner。

## 修改流程

出现测试新增、正文修改、删除、重命名、移动、拆分或合并，或者修改 runner profile、
静态规则、JUnit report 与身份归一时：

1. 从[文档导航](../navigation.md#如何阅读这些文档)进入，依次读取测试策略、相关行为
   owner 和本文件；需要通用评审方法时再读项目级 skill。
2. 修改前运行完整 `check`，确认起点的 static/runtime/Case 映射闭合；已有阻断诊断必须
   先按上节定位，不能归因给本次 diff。
3. 用 `topics`、有界 `list` 和 `show` 找到相关 Case；按实体查找时使用
   `list --entity-key`。
4. 先写清“owner 明确承诺的语义 -> 责任方可观察结果”，再决定复用、修改或新增 Case。
   新建 Case 时选择现有 topic；只有出现稳定的新查询分类才扩展 topic 表。
5. 修改测试与 Case 映射，运行目标实体所属的最窄 Bun test 命令。
6. 再次运行完整 `check`，处理发现闭合、owner、Case 与映射诊断。
7. 运行范围匹配的 workspace verification。

结构变化按语义连续性处理：

- **rename / move**：语义连续时保留 Case ID，只更新 entity key。
- **split**：把新实体分配给原目的；只有目的也分裂时才拆 Case。
- **merge**：实体合并不自动合并 Case；一个合并后的实体可以继续支持多个目的。
- **delete**：从所有 Case 移除实体；失去当前证据的 Case 必须删除、改写或重新关联。
- **正文变化**：即使 entity key 未变，也要重审 Case 的 owner、证明信号、可靠性与
  维护价值。

自动化测试需要复制被测实现、增加测试专用观测接口或依赖高成本脆弱环境时，在 owner
验证说明或 change 审查中记录 `Manual CR:`、审查对象和判定条件，不创建空测试或名义
Case。

## 查询与验证

从仓库根目录运行：

```bash
bun run test-evidence -- topics --root .
bun run test-evidence -- list --topic <topic> --root .
bun run test-evidence -- list --entity-key <entity-key> --root .
bun run test-evidence -- list --owner-ref <docs/path.md#heading> --root .
bun run test-evidence -- list --query <text> --limit <1-100> --offset <n> --root .
bun run test-evidence -- show <CASE-ID> --root .
bun run test-evidence:check
```

`topics`、`list` 和 `show` 只读取 Case 目录并输出 JSON；`check` 还会执行本 checkout
的完整受支持 Bun test surface 并验证闭合。查询命令不修改文件，也不存在需要同步的
派生制品。精确 Case ID 只通过 `show <CASE-ID>` 查询。

严格检查失败时按 diagnostic origin 处理：

- `profile` / `static`：runner profile、路径边界、ast-grep 规则或不支持的注册形态。
- `runner`：Bun 执行、JUnit report、static/runtime mismatch 或 entity identity。
- `case`：topic、Markdown、Owner、entity mapping 或 coverage。
- `query`：参数、筛选或 Case ID。

## 交付审计

测试或证据材料变更后确认：

1. 当前受支持测试面已经由 static/runtime closure 形成唯一实体集合。
2. 每个当前实体至少进入一个真实语义 Case，每个 Case 只引用当前直接实体。
3. `Owner` 真正拥有全部 `Proves`，且 `Proves` 不复述函数名或生成模板。
4. Rename、move、split、merge、delete 与正文变化已按语义连续性处理。
5. 账本没有 Entry、Contract、Status、marker、committed inventory/index 或兼容双读。
6. 目标测试、`bun run test-evidence:check` 与范围匹配的 workspace verification 已通过。
