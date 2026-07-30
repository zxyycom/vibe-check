本 design 把 Docnav 已验证的“当前测试实体事实 + 语义 Case 事实”模型适配到 Vibe Check 的 Bun 测试面。Design 只描述实现选择；迁移状态以 tasks、代码和验证证据为准。

## Context

建立本 change 前，Vibe Check 有 23 个受支持的 Bun test 文件。迁移基线的 JUnit 报告
包含 173 个唯一 `file + suite + test name` 节点；当时的 `docs/test-evidence/` 也有
173 个一节点一文件 Case，但旧目录工具不读取测试源码或 runner report，因此不能证明
没有漏项。这些旧 Case 可归入 35 个稳定责任前缀，正好覆盖历史聚合账本的 30 个语义组和
迁移后新增的 5 个组。

Docnav 曾先把完整测试面投影为逐入口 machine Entry，随后因语义说明退化和持久投影重复，
切换到当前最终模型：scanner 在内存中拥有完整测试实体事实，人工 Case 只拥有稳定证明
目的，严格检查计算两者的多对多双向覆盖。Vibe Check 只需 Bun adapter；Docnav 的 Cargo、
smoke、mise 与项目专属 topic/Case 不属于本项目。

当前 3 处动态 `test(...)` declaration 通过循环生成 24 个 runtime 节点；Docnav 的静态规则
有意拒绝这种无法从单一声明确定性恢复每个 runtime identity 的形态。其数据行服务同一
owner 不变量，适合保留为 3 个字面量命名测试中的内部参数矩阵。

## Goals / Non-Goals

**Goals:**

- 从完整受控 Bun test surface 同时取得静态声明和真实 JUnit runtime report，并在内存中
  闭合为唯一当前测试实体集合。
- 让语义 Case 直接连接精确 owner heading、可观察 `Proves` 和一个或多个当前实体。
- 阻断未映射实体、未知实体、非法或重复 Case，而不强制测试实体与 Case 一一对应。
- 删除无信息单节点模板、committed index、旧 runtime catalog 和兼容双读。
- 让 required workspace profile 复用 closure 已执行的完整 Bun test 结果，不重复运行。

**Non-Goals:**

- 不修改 Product CLI、quality runtime、scanner/output contract 或测试所证明的产品行为。
- 不移植 Cargo、smoke、mise、source fingerprint、rename 推断或 committed inventory。
- 不让工具自动生成 Case 标题、Owner 或 `Proves`，也不声称机械检查能判断文案语义质量。
- 不把历史 Case 或 OpenSpec 记录当作新增产品测试义务。

## Decisions

### Decision 1: 当前测试实体与语义 Case 分属两个事实 owner

项目工具从当前源码和 runner report 生成 transient `TestEntity`；Case source 保存
稳定语义。scanner 不生成 Case，Case 不手写测试存在事实。严格检查连接两个集合，保证
每个当前实体至少被一个 Case 引用、每个 Case 至少引用一个当前实体；同一实体可以支持
多个 Case，同一 Case 可以由多个实体支持。

这替换现行一对一决定。继续逐节点 Case 会保留 173 份重复文案；只保存聚合 Case 而没有
完整 scanner 又无法证明漏项。

### Decision 2: Bun static/runtime closure 使用 Docnav 的确定性边界

版本化 profile 固定两个 source roots：

- `scripts`
- `src/product`

目录规则选择 `**/*.test.ts`。ast-grep 只接受直接 `test` / `it`、字面量名称和受支持参数
shape，并显式阻断 alias、动态名称与参数化注册。Bun 对同一文件集合生成临时 JUnit；
static 与 runtime 以 `source path + declaration line + test name` 闭合，最终 entity key 为：

```text
bun|<workspace-relative-file>|<suite path > test name>
```

临时报告总是清理，不提交 inventory。profile、文件展开、静态规则、JUnit parser 和 closure
均有 focused tests。

### Decision 3: 动态数据矩阵留在三个稳定原生节点内部

当前两个 status mapping 循环和一个 GateResult invalid-case 循环分别改为一个字面量命名
test，循环和每行断言仍在 test body 内。它们各自只有一个共同 owner 目的；数据行不是独立
Case。原有测试面因此从 173 收敛到 152：149 个现有字面量节点加 3 个稳定矩阵节点。
本 change 新增的 9 个 test-evidence focused nodes 同样属于 `scripts/**` 完整测试面，最终
closure 预计包含 161 个当前实体。

不扩展 scanner 去解释任意 JavaScript control flow，也不把 `test.each` 作为特殊变体。

### Decision 4: Topic 与 Case 使用 Docnav 的最小持久布局

固定布局为：

```text
docs/testing/cases/topics.json
docs/testing/cases/<topic>.md
```

topic catalog 拥有稳定 ID、说明和顺序；每个 topic 文件用 H1 加零个或多个
`## Case <ID>: <title>` block。每个 Case 字段固定为：

```text
Owner: `docs/<owner>.md#<heading>`
Entities:
- `<full entity key>`
Proves:
- <owner 下可证伪、责任方可观察的判断>
```

parser 验证 workspace-safe/no-symlink source、受控 grammar、全局唯一 ID、精确 Owner heading、
非空 entity/proves 与重复项。项目不建立一 Case 一文件目录或 committed query index。

### Decision 5: 35 个当前责任组作为迁移边界

迁移前 173 个 Case 的 ID 去掉末尾三位序号后形成 35 个组；其中 30 个与更早聚合账本的
稳定 ID 同源，5 个为迁移后新增责任：

- `AUX-TOOLKIT-FOUNDATION`
- `AUX-WORKSPACE-PROCESS`
- `BB-CLI-ROUTING`
- `WB-RUNTIME-BASELINE`
- `WB-RUNTIME-QUALITY-CORE`

迁移逐组读取当前测试、当前行为 owner、历史语义和全部 entity key。语义连续的 30 个 Case
保留原 `...-001` ID；新增组建立一个稳定 ID。只有 owner requirement 或可观察失败类型
确实不同才进一步拆分，不能为覆盖诊断生成模板 Case。

test-evidence 工具自身的 9 个新增节点按 discovery、catalog 与 closure 三项工程语义建立
3 个 `AUX-TEST-EVIDENCE-*` Case，不伪装成原有 35 个产品/工具责任组。

### Decision 6: 查询直接读 Case，check 才运行完整 scanner

保留 `topics`、有界 `list` 和 `show <CASE-ID>`。查询只解析 Case source，无写入、无缓存；
`list` 支持 topic、owner-ref、entity-key、text 与 pagination。`check` 执行完整 discovery、
catalog validation 和 coverage join，并以诊断 origin 区分 profile/static、runner 与 Case
失败。

删除 `sync-index`、派生 index、旧 `scripts/test-evidence.ts` 薄 wrapper 和上游 runtime
catalog API。`scripts/test-evidence/index.ts` 成为 Vibe Check-owned CLI 入口。

### Decision 7: required gate 复用 closure 执行的 Bun 测试面

`test-evidence` required check 执行全部 161 个受支持 Bun entities并验证 Case closure。
full profile 删除 `test:product` 和两个 toolkit test 的重复任务；full quality check 改为
依赖 required `test-evidence`。局部 package scripts继续作为开发入口。

### Decision 8: Skill 使用 Docnav 的能力感知审查文本

当前上游 v7 skill 固定一节点一 Case，无法与新项目 owner 同时成立。本 change 将
`test-evidence-review` 替换为 Docnav 的项目能力感知版本，只保留测试质量和语义 Case
评审方法；Vibe Check 的 runner、目录格式、CLI 与门禁由项目代码和 owner 文档拥有。

这是 `use-upstream-project-skill-packages` 的明确单包例外；其它工程 skills 继续按完整上游
包维护。长期决策需要同步演进，不能让两个相冲突的 active decision 并存。

### Decision 9: 正文变化依赖显式 AI 语义复审，不引入 fingerprint

closure 能证明身份存在和映射当前，不能证明 test body 与 `Proves` 仍一致。测试正文变化
即使 entity key 不变，项目流程仍要求 AI 重读测试、owner 与相关 Case。source digest 只能
证明字节变化，不能证明语义是否改变；本 change 不为这一潜在提醒机制增加 baseline 状态。

## Risks / Trade-offs

- **[required check 变慢]** → closure 必须取得 runtime report；移除 full profile 重复执行，
  保持一次测试成本换取真实完整性。
- **[动态矩阵收敛降低逐行 runner 定位]** → 三个矩阵都服务单一不变量；断言保留 case label，
  失败仍指出具体输入，不拆成名义测试入口。
- **[自动检查无法判断 Proves 是否有意义]** → 精确 Owner heading 缩小语义边界，项目 skill
  明确执行 AI 评审；无法形成语义的实体合并、删除或重新归类，禁止模板生成。
- **[Gitlink toolkit 测试可能变化]** → profile 以当前 checkout 的显式 test roots 发现，
  runtime 与 static 两侧共享同一展开；任一 pin 变化立即产生 coverage diagnostic。
- **[硬切换删除 173 个文件]** → 当前提交历史可完整恢复；新 parser、closure 和 synthetic
  tests 先通过，再原子迁移 Case source，不保留双读。
- **[项目本地 skill 与上游包策略产生例外]** → 用长期决策明确限定仅
  `test-evidence-review`，不把例外扩展到其它 skills。

## Migration Plan

1. 先实现 Bun profile、ast-grep/JUnit discovery、static/runtime closure 与 synthetic tests。
2. 把 3 个动态注册收敛为字面量原生节点，运行两个目标测试文件并确认原有测试面为 152
   个唯一 entity；加入 focused tool tests 后确认完整当前树为 161 个 entity。
3. 实现 topic/Case parser、Owner validator、query 和 many-to-many coverage tests。
4. 以 35 个现有责任组迁移 Case；删除旧目录、index、sync 与上游 runtime catalog接线。
5. 更新项目 skill、AGENTS、测试/工具 owner、workspace verifier、OpenSpec 和长期决策。
6. 运行 rule/tool tests、目标 tests、全树 `check`、typecheck/lint、docs/OpenSpec/decision
   validation 和 required/full workspace verification。

回滚使用 Git revert 恢复旧 skill、目录、index、wrapper、测试注册和 verifier，不存在远端
状态或在线数据迁移。

## Open Questions

无未回答开放问题，可以进入实现前审计。
