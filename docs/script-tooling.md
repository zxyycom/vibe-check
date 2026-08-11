# 脚本工具

本文档是 Vibe Check 开发脚本工具边界的 owner：记录共享 toolkit、Vibe
Check-owned consumer、产品与 dogfood 的调用方向、配置 owner 和脚本验证入口。

## 范围

Vibe Check 的开发脚本以本仓库 `scripts/**` 为日常依据。`scripts/tools/*`
提供共享 helper source import；consumer、默认配置、profile 和 package scripts
由 Vibe Check 拥有。

Vibe Check 拥有的开发脚本入口是：

- `scripts/quality/scan.ts`：显式传入 Vibe Check 仓库根并委托
  `bun run product:cli -- scan [project-root]` 的 dogfood 薄 wrapper。
- `scripts/quality/annotate.ts`：把 quality warning NDJSON 渲染为 GitHub
  Actions non-blocking warning annotation；输入先经 Product warning-stream validator 完整
  验证。
- `scripts/docs/validate.ts`：校验 Markdown links、JSON syntax、current machine schemas/
  examples、generation drift，以及隔离的 historical report schema/examples。
- `scripts/decision-records.ts`：显式传入 Vibe Check 仓库根，复用项目内
  `decision-records` skill 的 ESM API，并提供长期决策查询、维护和检查入口。
- `scripts/test-evidence/index.ts`：项目自有的测试实体发现、语义 Case 查询与全树闭合
  入口；它运行受支持 Bun test surface，并校验 static/runtime/entity/Case 双向覆盖。
- `scripts/vibe-check-workspace/verify.ts`：项目级验证编排入口，使用
  `parallel-task-runner` 并行运行本地检查。

新增任何 Vibe Check-owned consumer 时，必须在本文补充入口、owner 和验证命令。

项目另外通过 package scripts 调用完整上游 Skill CLI：`change-plan` 管理 `changes/`，
`investigations` 管理按需建立的 `docs/investigations/`。这些入口不复制上游 parser、metadata、
索引或生命周期实现，也不属于 `scripts/**` consumer。

这些工具不属于产品 runtime contract。`quality:check`、`quality:full-check` 和
`quality:scan` 是省略 gate 的观察命令；`quality:gate` 是显式 opt-in 的阻断命令。它们
都是 package-level dogfood wrapper，不是第二套产品入口。

## 当前实现状态

- `scripts/quality/scan.ts` 只显式传入 Vibe Check 仓库根并调用
  `src/product/cli.ts` 的正式入口。
- `quality:check`、`quality:full-check`、`quality:scan` 与 `quality:gate` 通过该
  wrapper 到达同一产品 core；wrapper 只透明传递参数和产品 exit。
- Wrapper 显式传入 repository root，但不传入默认 `--config`；Product Config 从
  `<repo-root>/.vibe-check/config.json` 发现 checked-in repository policy。调用者提供
  `--config` 时仍由 Product 保持 explicit precedence。
- `src/product/**` 拥有 TypeScript 运行时闭包和唯一默认配置；开发脚本不保留第二套参数、
  配置或扫描 core。
- Required workspace verification 严格检查 decision records，并调用 test-evidence
  check 执行完整 Bun 测试面及语义 Case 闭合；required profile 还调度 formal
  producer-to-actual-annotation acceptance child。
- Current schema/examples checks 显式注册 semantic config 与 metrics/warning v1，验证 config
  schema/example generation drift、semantic example independent acceptance 和五组 canonical
  machine sets，并把 `vibe-check.report.v1` historical materials 隔离在 historical
  registry/traversal。
- Rust 产品构建 helper 与 quality-core gitlink 已移除；`foundation` 和
  `parallel-task-runner` gitlinks 仍服务开发脚本。

## 工具来源

可复用脚本工具以 pinned submodule 形式放在 `scripts/tools/` 下：

- `foundation`：process、Git、path、filesystem、JSON、CSV、NDJSON、
  argument、error 和 type guard helpers。
- `parallel-task-runner`：task normalization、dependency graph validation、
  concurrency、mutex scheduling 和 lifecycle hooks。

每个 toolkit 都通过 `scripts/tools/*/src` 的源码 import 被消费。它们不是 npm
package contract，也不拥有 Vibe Check 的 package scripts、profile 或 artifact
路径。

质量产品的 schema/types、scanner adapters、metrics、warnings、reports、
baseline/cache primitives 和必要 `foundation` helper 闭包归属 `src/product/**`，
不是开发脚本 toolkit。开发脚本可以单向调用产品入口，但产品运行时不得 import
`scripts/**`、`foundation` gitlink 或其它 toolkit gitlink。

已移除 quality-core gitlink 的来源 revision 和产品内 foundation helper 闭包记录在
`src/product/README.md`。`foundation` 与 `parallel-task-runner` gitlinks 不是产品 runtime
依赖。

## 新 checkout 初始化

在新的 checkout 里运行仍由开发脚本消费的 toolkit 前，先初始化对应 submodule，并安装
lockfile 固定的 Node 依赖：

```bash
git submodule update --init --recursive
pnpm install --frozen-lockfile
```

这些命令只准备本地开发工具，不构建也不修改 `src/product/**`；quality dogfood 不依赖
quality-core submodule。

## Runtime 边界

`src/product/**` 是 TypeScript/Bun 产品 runtime 的唯一源码 owner，正式本地入口是：

```bash
bun run product:cli -- scan [project-root]
bun run product:cli -- init [project-root]
```

省略 project root 时使用启动 cwd。开发脚本可以调用 lizard、scc、jscpd 和 JSON schema
validator；项目治理入口可以调用安装在 `.codex/skills/` 的 decision、change-plan 与
investigation CLI。产品扫描所需的 scanner 调用必须由 `src/product/**` 内的产品
边界拥有，不能由 wrapper 重新实现。Dogfood wrapper 只调用 `scan`；`init` 是用户直接调用的
Product Config operation，不属于 script tooling。

仓库 dogfood 入口是：

```bash
bun run quality:check
bun run quality:full-check
bun run quality:gate -- --baseline <revision>
bun run quality:scan
```

这些命令与 `scripts/quality/scan.ts` 必须显式传入 Vibe Check 仓库根并单向调用同一
产品入口。它们不复制或生成 config，而是让 Product Config 发现 repository root 下的
checked-in complete policy。Package consumer 分类为：

| 命令 | Gate 行为 |
| --- | --- |
| `quality:check` | quick profile，省略 gate，warning 非阻断 |
| `quality:full-check` | full profile current snapshot，省略 baseline 与 gate，warning 非阻断 |
| `quality:scan` | 不隐式选择 gate policy；调用者参数透明传递 |
| `quality:gate` | 固定 full `regressions` policy；调用者必须透传显式 baseline，evaluated failure 或 evidence/runtime failure 按产品 exit 阻断 |

Gate policy、evidence prerequisite、evaluation 与 process mapping 仍由产品实现拥有；
`quality:gate` package script 显式传入 `--profile full --gate regressions`，thin wrapper
只透明转发调用者的 `--baseline <revision>`、其它 `argv` 和产品 exit，不推断 branch、merge
base、upstream 或 remote。没有显式 baseline 时，正式 CLI 在 scan work 前以 usage exit `3`
拒绝该 gate。默认 artifact 继续写入
`artifacts/vibe-check-quality/`，并作为 generated local state 忽略。

开发期 workspace 验证入口是：

```bash
bun scripts/vibe-check-workspace/verify.ts --profile required
```

验证日志写入 `.log/verify/workspace/`。日志和 artifact 只用于本地定位，不属于
release artifact。

## Quality annotation consumer

Repository annotation entry 保持：

```text
bun run quality:annotate -- [warnings-path] [limit]
```

- Default warnings path 是
  `artifacts/vibe-check-quality/warnings-all.ndjson`；default limit 是 `5`。
- Limit 必须匹配 `^[1-9][0-9]*$` 且不超过 `Number.MAX_SAFE_INTEGER`；extra argument、
  invalid limit 或 read failure 都是 handled infrastructure failure。
- Consumer 以 bytes 读取 selected stream，并只通过 `src/product/machine-output.ts` shallow
  boundary 调用 Product `MachineWarningV1` warning-stream validator。完整 validation 成功后
  才过滤 `info`、应用 limit 并渲染 GitHub commands；script 不保留 render-only parser 或
  deep-import quality-core internals。
- Conforming non-empty stream 产生 filtered/limited annotations；zero-byte stream 产生 zero
  commands；两者退出 `0`。
- Argument/read/decoding/framing/syntax/schema failure 在 stdout 产生 zero annotation
  commands，stderr 输出 actionable diagnostic，并退出 `2`。Validation 不返回 valid prefix，
  因而不会产生 partial annotations。
- Warning quality values 永不使 annotation 自身 non-zero。Annotations 始终是 non-blocking
  GitHub warnings；需要 best-effort orchestration 时由 workflow 使 step non-blocking，不能
  放宽 parser acceptance。

Warning identities、field semantics 与 byte grammar 由
[Output](output.md#validator-boundaries) 拥有；本节只拥有 direct script consumer 的参数、
render timing 和 exit behavior。

## Independent docs validation and workspace acceptance

Docs validation 故意把 current product、independent acceptance 与 historical materials
分开：

1. `scripts/docs/config-schema.ts` 从 Product semantic runtime schema source deterministic
   生成 published config schema；`--check` 检测 bytes drift。Independent schema/example
   validation 只消费 checked-in publication 与 canonical semantic example，不把 project-local
   sibling editor schema 当作 runtime authority。
2. `scripts/docs/machine-schemas.ts` 从 Product runtime schema source deterministic 生成
   metrics/warning published schemas；`--check` 按 bytes 检测 drift。
3. `scripts/docs/machine-examples.ts` 从 fixed core fixture values 经 production mapper/
   serializers 生成五组 current examples；`--check` 检测 exact inventory 与 byte drift。
4. `scripts/tools/validators/schema/machine-artifacts.ts` 使用 checked-in current schemas、
   raw bytes 与独立 parser/set predicates 验证 examples；它不 import Product validator 作为
   acceptance implementation。
5. `scripts/tools/validators/schema/registry.ts` 的 current registry 显式注册 config 与
   metrics/warning v1。Historical `vibe-check.report.v1` 使用 separate registry，
   `docs/examples/json/**` 不进入 current example traversal。
6. `bun run validate:docs` 独立调度 JSON、schema、examples、links tasks，并同时覆盖 strict
   compile、independent acceptance 与 generation drift。

Required workspace profile 另外运行
`scripts/quality/producer-annotation-acceptance.test.ts`：child 使用 formal Product CLI 产生
non-empty/zero-byte streams，再调用 actual `quality:annotate`，并用 derived invalid input
证明 exit `2` / zero partial annotation。Workspace verifier 只调度 child、保留 actionable
output 并传播 result，不增加 artifact parser、schema registry 或 warning mapper。

## 项目级 Skill 维护

项目级 Skill 默认保存完整、可追溯的上游分发单元。Vibe Check 的触发规则、owner 路由、
默认存储位置、package scripts、适配器和验证入口留在包外；上游包内的 Skill、agent 指引、
契约、schema、runtime、声明、source map 和 updater 保持同一 release。

| 完整上游包 | 项目接线 |
| --- | --- |
| `.codex/skills/change-plan/` | `changes/`、`change-plan*` package scripts 与[决策和 Change 治理](decision-and-change-governance.md) |
| `.codex/skills/decision-records/` | `docs/decisions/`、`scripts/decision-records.ts` 与 `decisions*` package scripts |
| `.codex/skills/investigation-report/` | 按需建立的 `docs/investigations/` 与 `investigations*` package scripts |

同步这些包时使用各包 updater 或同一 release asset 完整替换，先核对目标 release，再运行包的
机械检查、项目文档检查、脚本检查及受影响 workspace 验证。项目不在包内重放本地语义覆盖。

当前唯一登记的项目方法层 Skill 例外是：

| 项目本地例外 | 项目维护文件 | 覆盖范围外的职责 |
| --- | --- | --- |
| 能力感知的测试证据评审 | `.codex/skills/test-evidence-review/SKILL.md`、`.codex/skills/test-evidence-review/agents/openai.yaml` | 项目测试证据 owner 继续拥有 Runner、Case、CLI 和闭合 runtime。 |

该表是项目本地例外的完整边界。后续只有项目特有 owner 与验证入口能证明上游方法不适用时，
才通过新的决策演进增加例外；工具 runtime、schema、索引和产品行为仍不得 fork 到方法层。

## 长期决策适配器

项目内安装的
[`decision-records`](https://github.com/zxyycom/skills/tree/main/skills/decision-records)
工具契约拥有 domain catalog 与决策记录的固定格式、通用 lifecycle 与关系事务、索引生成以及
CLI / ESM API 精确语义；项目的 `decision-domains.json` 和决策 Markdown 分别拥有实际 domain
边界与每条决策的内容和状态。项目 owner 按
[决策与 Change 治理](decision-and-change-governance.md)路由当前事实、长期方向和单次计划。
Vibe Check-owned
`scripts/decision-records.ts` 显式传入仓库根、转发 CLI 参数，并为模块调用暴露
`runDecisionRecordsCli`、`scanDecisionRecords` 和 `validateDecisionRecords`。适配器不复制
解析、校验、索引维护或关系语义，`src/product/**` 也不导入该开发工具。

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run decisions:list` | 列出活动决策的检索投影 | 只读 |
| `bun run decisions:check` | 严格检查目录、Markdown、索引和关系 | 只读 |
| `bun run decisions -- <command>` | 调用 skill 的完整 CLI | 由具体命令决定；写命令按 skill 契约执行 |

## Change Plan CLI

项目内完整上游 [`change-plan`](../.codex/skills/change-plan/SKILL.md) 拥有 Change 目录、固定
artifacts、metadata、stage、assessment、Git 距离与 lifecycle CLI。项目只固定 `changes/` 根和
package scripts：

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run change-plan:list` | 列出 `changes/` 下 active Change | 只读；发现 invalid member 不等于验收通过 |
| `bun run change-plan -- show changes/<change>` | 展开一个 Change、assessment、任务进度和 artifacts | 只读 |
| `bun run change-plan -- check changes/<change>` | 按当前 stage 机械检查目标 Change | 只读 |
| `bun run change-plan -- <lifecycle> changes/<change>` | 调用 plan、implement、shelve、reconcile、resume 或 archive | 按命令改变 metadata 或目录；仍需语义审阅和当前授权 |

CLI 使用稳定的命令与 JSON 输出边界；项目不依赖其未承诺稳定的直接 import API。

## Investigation Report CLI

项目内完整上游 [`investigation-report`](../.codex/skills/investigation-report/SKILL.md) 拥有主题、
可选随附资源、派生索引、同步、查询与 `stage-index`。集合只在用户明确要求沉淀调查时建立；
不存在的 `docs/investigations/` 不用空目录或空索引伪装为合法集合。

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run investigations:list` | 从已核对新鲜度的索引查询主题 | 只读 |
| `bun run investigations:check` | 全量检查主题、资源与派生索引 | 只读 |
| `bun run investigations -- sync-index` | 从主题和资源重建工作树索引 | 写派生索引，不写主题或资源 |
| `bun run investigations -- stage-index <topic-id...>` | 只把选中主题对应的索引变化写入 pending | 写版本管理 pending，不暂存主题或资源 |

## 测试证据闭合工具

Vibe Check-owned [`scripts/test-evidence/`](../scripts/test-evidence/) 拥有 runner
profile、ast-grep static scan、Bun JUnit runtime report、实体 identity、Case parser、
topic catalog、查询和闭合诊断。项目内
[`test-evidence-review` skill](../.codex/skills/test-evidence-review/SKILL.md) 只提供
能力感知的语义评审方法，不携带项目路径、runner adapter、schema、CLI runtime 或第二套
持久化格式。

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run test-evidence:list` | 列出当前语义 Case；需要有界筛选时使用完整 CLI | 只读 |
| `bun run test-evidence -- topics\|list\|show --root .` | 按 topic、entity、owner、文本或 Case ID 查询 | 只读 |
| `bun run test-evidence:check` | 运行完整 Bun 测试面并严格检查 static/runtime/entity/Case 闭合 | 只读 |
| `bun run test:test-evidence-rules` | 验证 ast-grep Bun test 发现规则 | 只读 |
| `bun run test:test-evidence` | 运行 test-evidence 工具 focused tests | 只读 |

测试层级和项目级维护规则由 [测试策略](testing.md) 与
[测试证据维护](testing/case-maintenance.md) 拥有。Case 按共同 owner 契约与可观察结果
划分，并与完整当前实体集合 many-to-many 闭合；产品语义继续由对应行为 owner 定义。

## 配置所有权

Public project configuration 的 neutral default、document/schema、selection/discovery、
`ResolvedQualityConfig` mapping、CLI precedence 与 `init` 全部由
[Configuration](configuration.md) 和 `src/product/**` 拥有。Scanner command/args/availability
由 [Scanner 依赖选择](scanner-dependencies.md) 拥有；gate evaluation 与 exit contract 由 Product
CLI、Quality Metrics 和 Output owner 承接。

Repository-owned complete policy 位于 `<repo-root>/.vibe-check/config.json`。Dogfood wrapper 只
插入 repository root，因此 quick、full、default 与 gate entries 都通过正式 discovery 消费该
policy；wrapper/package scripts 不保存第二套 default、field tree 或 selection logic。相邻
`config.schema.json` 是 editor projection，不是 runtime authority，也不由 wrapper 读取。

长期产品语义由 `docs/architecture.md`、`docs/scanner-dependencies.md`、
`docs/quality-metrics.md` 和 `docs/output.md` 拥有；已退役 schema/examples 的历史状态由
Output owner 说明。

`scripts/tools/validators/config.ts` 拥有开发期文档验证路径和任务名；它登记 current semantic
config、metrics/warning schemas、historical report schema 与对应 example roots，不重新定义
Configuration 或 Output contract。

`scripts/vibe-check-workspace/checks/definitions.ts` 拥有 workspace verifier 的
任务集合、profile 分层、warning output 识别和成功输出过滤。Required profile 包含
decision records 与 test evidence 的严格检查。它不定义产品行为，只编排已有命令。

## 验证入口

修改脚本工具接入时，如果 `node_modules/` 或 `scripts/tools/*` 缺失，先完成上面的
新 checkout 初始化。

按改动面选择最窄验证：

| 改动面 | 命令 |
| --- | --- |
| 脚本类型或 lint | `bun run typecheck:scripts`、`bun run lint:scripts` |
| 长期决策适配器或记录集合 | `bun run decisions:check`；适配器改动另跑 `bun run typecheck:scripts`、`bun run lint:scripts` |
| 测试证据闭合工具或 Case 集合 | `bun run test-evidence:check`；工具改动另跑 `bun run typecheck:scripts`、`bun run lint:scripts` |
| 产品入口、dogfood wrapper 或 repository config discovery 接线 | `bun run quality:check`，并按影响面补充产品入口测试 |
| Opt-in repository gate | `bun run quality:gate -- --baseline <revision>`；该真实 gate 可按产品 contract 退出 `0`、`1` 或 `2`，缺少/无效 baseline 退出 `3` |
| 文档校验 | `bun run validate:docs` |
| workspace verifier | `bun run verify:vibe-check-workspace:required` |
| current schema/example generation drift | `bun scripts/docs/config-schema.ts --check`、`bun run generate:machine-schemas -- --check`、`bun run generate:machine-examples -- --check`；日常由 `validate:docs` 调度 |
| producer-to-annotation acceptance | `bun test scripts/quality/producer-annotation-acceptance.test.ts`；required workspace profile 也调度 |
| quality annotation | `bun run quality:annotate -- [warnings-path] [limit]` |
| toolkit pin、checkout 或 import | `bun run toolkit:foundation:test`、`bun run toolkit:parallel:test` |

产品行为改动按 TypeScript/Bun 产品验证入口执行。
