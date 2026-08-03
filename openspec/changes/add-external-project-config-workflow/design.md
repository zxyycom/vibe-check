## 文档责任

本 design 只拥有 external config workflow 的跨组件决策：文件发现、authoring grammar、
document metadata、初始化、选择 provenance、安全写入和验证分层。Public semantic field model
与 scanner dependency isolation 由前置 `decouple-project-config-from-scanner-tools` 拥有；目标
可观察行为由本 change 的 `specs/**` 拥有；执行进度只看 `tasks.md`。

## 当前事实与实施起点

| Surface | 当前已实现事实 |
| --- | --- |
| CLI operations | Product CLI 只路由 `scan`；`init` 是 unknown command。 |
| Omitted config | `runScan` 调用 `createDefaultConfig()`，任意 project root 都会继承 Vibe Check-specific values。 |
| Explicit config | `--config <file>` 选择完整 UTF-8 strict JSON `QualityConfig`；相对路径基于 normalized project root。 |
| Public config coupling | 当前 fields 直接暴露 `lizard`、`scc`、`jscpd` 和 `tools.<name>.command/args`。 |
| Parser | `config-file.ts` 使用 fatal UTF-8 decoding、`JSON.parse` 与手写 exact-field validation。 |
| Dogfood wrapper | `scripts/quality/scan.ts` 传入 repository root，但不传 config path。 |
| Machine output | metadata 已有 `configVersion`；selected source/path 不是 stable machine fields。 |

这些事实不是本 change 的目标实现起点。开始 section 1 前，前置 semantic-config change 必须
已经：

1. 用 tool-neutral semantic fields 替换 public tool-named config；
2. 建立 Product-owned runtime semantic schema 与 typed mapping；
3. 把 scanner command/args、platform resolution 和 operational overrides 收口到内部 dependency
   boundary；
4. 完成 legacy explicit config、existing fixtures/examples、docs 和 tests 的语义迁移，并提供
   external workflow 生成 dogfood config 所需的 final repository semantic values。

本 change 随后只在该 semantic contract 上增加文件工作流，不能恢复 tool-named public fields。

## 目标不变量

1. 每次 formal scan 在 scanner work 前恰好选择、解析和归一化一份完整 semantic config
   document。
2. 省略 `--config` 时只发现 `<project-root>/.vibe-check/config.json`；不搜索其它目录或 alias。
3. User-facing 文件名保持常规 `.json`，Vibe Check content grammar 明确允许 comments 和
   trailing commas；标准 strict JSON 是兼容子集。
4. Semantic runtime schema 是 project fields 的单一 owner；generated editor schema 是消费
   视图，不是 runtime input。
5. `init` 只创建固定 tool directory 和两份 tool-neutral artifacts，不覆盖任何已有 path，
   不检测项目或解析 scanner dependency。
6. Core、Scanner 和 wrapper 不拥有 config discovery、document parsing、schema generation 或
   merge。
7. Stable machine v1、scanner algorithms、quality semantics、gate 和 artifact filenames 不变。

## 实现归属与依赖方向

| 实现归属 | 本 change 中的责任 | 明确禁止 |
| --- | --- | --- |
| Semantic Config owner（前置 change） | Public semantic fields、runtime schema、typed mapping、semantic validation 和 internal dependency handoff | 在本 change 复制 field tree 或恢复 tool-named public fields |
| Product CLI (`src/product/**`) | operation routing、project-root normalization、help、top-level error/exit mapping | 在 CLI 内复制 schema、scanner 或 config merge |
| External Config workflow (`src/product/**`) | 固定路径、document `$schema` composition、comment-capable loader、selection、`SelectedConfig`、starter/schema bytes 和 init filesystem operation | 设计 semantic fields、解析 scanner dependency、读取 sibling schema |
| Scan orchestration (`src/product/**`) | 在 dependency preflight 前打印 config provenance，把一个 resolved semantic config 交给 current/baseline/fallback | 按 source 分支或重新读取配置 |
| Internal dependency boundary（前置 change） | 把 product semantics 映射到当前 scanner，并处理 command/args/platform/operational inputs | 修改 selected project config 或进入 generated config/schema/help |
| Product Core / Scanner | 消费 normalized product semantics 和已解析 dependency | 发现 config、解释 document grammar 或读取 editor schema |
| Dogfood wrapper (`scripts/**`) | 显式传入 repository root 与 `--config .vibe-check/config.json`，透明传递 args/output/status | 解析、生成、merge 或按 platform 改写 config |

调用方向保持 `scripts/** -> src/product/**`。新增模块只按现有 Product Config 职责和变化原因
拆分，不为两个固定文件建立 generic config framework、provider hierarchy 或 shared constants
bucket。

## 边界模型

三个概念保持分离：

```text
Semantic project config
  = prerequisite-owned complete, tool-neutral product fields

ConfigDocument
  = Semantic project config
  + optional "$schema": string metadata

SelectedConfig (readonly internal context)
  config: resolved semantic project config
  source: "explicit" | "discovered"
  path: normalized absolute config path
  version: config.version
```

`ConfigDocument` 与 `SelectedConfig` 使用显式 TypeScript 类型；external bytes 先以 `unknown`
进入 parser/schema boundary。`$schema` 只属于 document，绝不进入 Core、dependency resolution、
cache identity 或 machine DTO。Current、baseline 和 Git-failure fallback 共享同一 resolved
config 语义。

Scanner identity、command、args、platform executable 和 operational override 不是 project
config field，也不进入 `SelectedConfig`。Dependency boundary 可以在 scan preflight 解析这些
内部运行输入，但不得修改 project config 或把 applied tool names 混入 config provenance。

## 选择、解析与 precedence 数据流

Product CLI 与 External Config workflow 按固定顺序完成一次边界归一化：

1. CLI 基于 launch cwd 归一化 `project-root`。
2. 如果调用者传入 `--config`，按现有 project-root path semantics 得到 explicit absolute
   path；否则只构造 `<project-root>/.vibe-check/config.json` discovered path。
3. Config boundary 验证 selected path 是可读 regular file，并执行 fatal UTF-8 decoding。
4. 单一 content-based loader 使用 `Bun.JSONC.parse` 把 bytes 解析为 `unknown`；这是 parser
   implementation，extension 不参与 parser/schema 选择。
5. Composed runtime document schema 复用 prerequisite semantic schema，并只增加 optional
   `$schema` metadata；schema 验证完整 fields、closed objects、types、enums 和可表达 constraints。
6. Semantic Config owner 执行其 runtime-only post-validation；workflow 不复制这些规则。
7. Boundary mapper 去除 `$schema`，产生新的 typed semantic config；不修改 raw input，不从
   built-in config 补字段。
8. Product Config/CLI 只应用显式 `--top-n` 和 `--artifact-dir` project-field overrides。
9. 创建 readonly `SelectedConfig`，在 dependency preflight 前向 human console 输出 source、
   path 和 version。
10. Scan orchestration 只把 `SelectedConfig.config` 交给 current、baseline 和 fallback；后续
    阶段不重新查找文件、读取 schema 或按 source 分支。
11. Internal dependency boundary 独立解析当前 scanner runtime inputs；其结果不回写 project
    config，不改变步骤 1-10 的 precedence/provenance。

Project-config precedence 只有：

```text
one explicit-or-discovered complete semantic document
  < explicit --top-n / --artifact-dir
```

没有 built-in project value、第二个 file、environment project patch、partial object、parent
config 或 dependency setting merge。Explicit 与 discovered documents 从不共同参与一次 scan。

## Semantic schema composition 与 editor schema

前置 change 的 Product-owned semantic runtime schema source 拥有 public project fields、
required/optional、closed-object、type、enum、description 和可表达 constraints。本 change：

- 组合 optional `$schema` document metadata，不复制 semantic field tree；
- 对 parsed `unknown` 使用 composed schema，并把首要 failure 映射为 field-aware diagnostic；
- 保留 prerequisite-owned typed mapping 与 runtime-only semantic checks；
- deterministic serializes 同一 composed source 为 JSON Schema 2020-12；
- 用 generation drift proof 比较 source projection 与 generated bytes；
- 永不打开、导入或信任 sibling `.vibe-check/config.schema.json`。

Vibe Check JSON grammar 允许 line/block comments 与 trailing commas，标准 JSON 是兼容子集。
Implementation 复用当前 Bun runtime 的 native JSONC parser，但 user-facing filename 固定为
`config.json`，不要求调用者理解 `.jsonc` extension。不新增 parser dependency，不使用正则/
自定义 comment stripping，也不保留 `JSON.parse`-only 旁路。

## Initialization workflow

`init [project-root]` 先在内存中生成并验证：

```text
<project-root>/.vibe-check/
  config.json
  config.schema.json
```

`config.json` 使用 UTF-8、LF、两空格缩进和一个尾随换行，固定包含
`"$schema": "./config.schema.json"`。注释只解释会改变填写判断的 semantic sections，例如
scope、code areas、quality thresholds、report 和 artifact/cache paths；不逐个复述 schema 已
表达的 scalar type，也不提 scanner/tool identity。

Starter 使用 neutral scope、area names、quality values、report text 与 project-local artifact/
cache paths；不包含 Vibe Check-specific values、scanner names、command/args 或 host/source-
checkout paths。由于 dependency resolution 不在 document 中，同一 product revision 的
config/schema bytes 必须跨 supported host platform 一致。第一版只有一个 mixed starter，不
推断语言，不提供 preset。

Filesystem operation 遵循以下状态：

1. 验证 normalized project root 是 existing directory；在任何持久修改前生成并自校验两份
   bytes。不要把预先 access check 当作可写性证明，以实际 create/write result 映射权限失败。
2. 对最终 `.vibe-check` 执行 non-recursive exclusive directory creation。任何既有 file、
   directory、symlink 或 concurrent winner 都作为 `already-exists` 失败，不读取或修改其内容。
3. 只在本 invocation 新建并拥有的目录中，以 exclusive file creation 写入两个固定文件。
4. 受控写入失败时，只清理由本 invocation 创建的精确文件，并只在目录仍为空时移除该目录；
   不使用 recursive delete、通配符或 project-root-wide cleanup。
5. 两个 write 完成后打印 created paths 与精确下一步 scan command，exit `0`。

“All-or-nothing”只承诺正常返回和受控 generation/write failure；不声称 process termination、
掉电或外部恶意写入下的 crash-safe transaction。异常中断后若 `.vibe-check` 残留，下一次
`init` 仍 fail closed，不自动修复或覆盖。

`init` 不进入 scan core，不检查语言/scanner availability，不解析 dependency，不联网、不
安装依赖、不修改 package scripts。

## 错误与输出模型

Config workflow 使用一套受控、可识别的 failure model；CLI 统一映射：

| Failure stage | 必需 diagnostic context | Exit / side-effect boundary |
| --- | --- | --- |
| config selection missing | normalized candidate path；`init` 与 `--config` recovery | exit `3`；无 banner/scanner/baseline/cache/artifact |
| selected file type/read/UTF-8/config syntax | normalized selected path；简明原因，syntax location 可用时保留 | exit `3`；无 scan work |
| structural/semantic validation | normalized selected path；field path 与失败原因 | exit `3`；无 scan work |
| init root/existing/write failure | normalized project/tool path、失败阶段与安全恢复动作 | exit `3`；既有 path 不变；受控失败按上节 cleanup |

所有 failure 写 stderr；成功 created paths、next command 与 scan provenance 写 human stdout。
错误不得输出 config 全文、stack trace 或假成功 artifact path。Dependency failure 继续由
internal dependency/scanner boundary 处理，不伪装成 project-config error。Machine v1 不变。

## 编码约束

- 固定 directory/file names、config source union 和 stable diagnostic category 放在 External
  Config 职责内；semantic field/schema constants 留在 prerequisite owner。
- 文件、config syntax 与 schema 都是边界；raw value 以 `unknown` 接收，完成 decode、
  validate、normalize 和 error mapping 后才进入 domain functions。
- `SelectedConfig` 和跨模块结果优先使用 readonly object/discriminated union；普通失败使用
  同一 typed result 或 controlled exception family，不用 `any`、静默 fallback 或空 config。
- Semantic runtime schema 是唯一 project field tree；workflow 只组合 metadata 并生成消费
  artifact，不复制字段、tool mapping 或 post-validation。
- 复用 Bun JSONC parser 和现有 `typebox`；不新增 dependency，不建立 generic transaction/
  config framework。
- Path construction 使用 normalized root 与平台原生 path APIs；write/cleanup 只操作两个固定
  files 和精确 tool-directory path。
- Wrapper 只传参；Product runtime 不导入 `scripts/**`。Core/Scanner 不知道 discovery、
  `$schema` 或 editor schema。

## Verification strategy

1. **Schema/document unit**：comments/trailing commas、strict JSON subset、closed semantic fields、
   optional `$schema`、tool-name absence、diagnostics、schema generation drift。
2. **Selection unit/integration**：explicit/discovered precedence、project-root path resolution、
   one resolved config、CLI field overrides、missing/invalid config pre-scan failure。
3. **Initialization integration**：cross-platform deterministic bytes、neutral/tool-free content、
   existing-path preservation、directory race、injected write failure cleanup、no scan side effects。
4. **Formal-entry acceptance**：从 project root 外执行 init/discovery/explicit/missing/schema-
   independence flows，观察 console、scanner invocation、artifacts 和 exit。
5. **Dogfood acceptance**：checked-in semantic config/schema 与所有 `quality:*` wrappers 显式选择
   同一 config，保持 profile/gate/status pass-through。
6. **Architecture/tooling**：semantic schema composition boundary、dependency isolation、product
   import boundary、typecheck/lint/tests、Case closure、owner docs/OpenSpec/workspace validation。

修改测试前先运行并查询当前 test-evidence；修改后先跑最窄目标测试，再运行完整 strict
closure。具体命令和勾选证据由 `tasks.md` 维护。

## Dependencies and ordering

1. 已归档 explicit-config capability 是当前实现基线。
2. `decouple-project-config-from-scanner-tools` 必须先实施、验证并同步 owner docs；本 change
   task 0.7 随后按最终 semantic schema rebase artifacts，才可开始 section 1。
3. Stable machine v1 不变，不需要 output-contract change。
4. `port-lizard-function-metrics-to-typescript` 继续延期且不阻塞产品向工作。完成 semantic
   decoupling 后，port 只改变 internal dependency/runtime，不再拥有 public config migration。

## Risks and recovery

- `.json` 文件允许 comments/trailing commas，generic strict parser 可能拒绝。Help、generated
  comments、`$schema` 和 diagnostics 必须称为 Vibe Check JSON grammar，不虚构通用 strict JSON
  compatibility；strict JSON 仍是受支持子集。
- 完整 starter 较长。Annotated generation 与 schema 先解决 onboarding；只有真实使用证据
  显示完整文件仍造成维护问题时，才另行设计 partial config。
- Omitted-config fail-closed 是有意兼容变化。Tool-directory discovery、`init` 和同 revision
  dogfood migration 构成恢复路径。
- Editor schema 可被编辑或删除，因此 runtime 必须忽略它；runtime source 与 drift tests
  防止生成材料漂移。
- Init 不是 crash-safe transaction；handled failure 必须 cleanup，异常残留由 exclusive
  existing-directory failure 保护。

Rollback 以 repository revision 为单位：同时恢复 omitted-config fallback、移除 discovery/
init/schema workflow、恢复 wrapper behavior，并同步 help/tests/docs。不得回滚或重新暴露
前置 semantic config 的 tool-neutral boundary。

## Deferred triggers

- 只有 generated complete configs 出现具体维护/兼容证据时，才提出 partial-config change。
- 只有产品目标超出 formal local source-checkout entry 时，才提出 package/distribution change。
- 只有 versioned output-contract change 才能增加 machine-visible config provenance。
- 只有产品优先级决策记录列出的恢复条件满足时，才提前启动 Lizard TypeScript port。

## Contract status

本 workflow 没有独立产品未决问题。前置 change 的 semantic field、`version`、`checkId` 与
legacy migration 选择已经确认；在该 change 完成实现、owner sync 和验证，并关闭本 change
task 0.7 前，仍不得开始本 workflow 的 section 1。
