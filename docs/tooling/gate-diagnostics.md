# Gate 诊断与进程证据

维护 Gate 的 native diagnostics、外部命令失败投影或日志呈现时使用本文。它拥有 adapter 的安全字段与失败边界；
Run 入口、Check 选择和最终退出码见[Project Gate](project-gate.md)，文件路径能力见其[证据目录](project-gate.md#每次运行的证据目录)。

## Process evidence

### Native 诊断与 Record 预览

Native docs、Decision Records 与 semantic Test Evidence Checks 不创建单进程 transcript。
它们只把 producing owner 已批准、已排序的 typed safe diagnostics 投影为 private native adapter 所需的 `{ id, data }`；每项诊断成为一个完整的 Check-local Record。

adapter 不从 Record data 推断 ID、字段、顺序或 presentation，只保留独立的 focused command message。
Product progress 拥有默认 terminal preview：

- 每个 settled block 最多五条 Record，按该 Check 的 canonical local Record ID 排序。
- 每条 Record 行显示 local ID 与 canonical JSON data。
- terminal-control escaping 后，每条最多 240 个 Unicode code points，包含 `… [truncated]` marker。
- 余项以准确 omitted count 指向完整 Records。

预览不改变 Check data、status、aggregate 或 machine Record set。

native adapter 收到空、重复或不安全的 `{ id, data }` diagnostics，或 native operation 抛错时，必须 fail closed 为 `unavailable`。此时不发布 synthetic failed Record，也不创建 transcript。

两类治理诊断各自限制可发布字段：

- **Decision Records：** 只发布经 capability 验证的 decision ID、repo-relative source/index path 与 owner-authored classification；不转交可能含 YAML、schema 或 filesystem detail 的 `errors: string[]`。
- **Test Evidence：** 只接受封闭 origin/code allowlist，并依 code-specific policy 投影已验证的 repo-relative path/location、Case ID 和 `runner: "bun"`；child output、parser/error message、JUnit target/selector/entity key 与其它自由文本不进入 Record。

### 外部命令 transcript

每个 external-command Check 只从自己的 `CheckExecutionContext.artifactDirectory` 读取路径能力；未授予时以 `transcript-unavailable` fail closed。已授予时，它在启动 child 前写入 `checks/<encoded-check-id>/process.log` 的 running transcript，并在结算后将同一路径改写为 command、stdout/stderr、exit/signal/timeout 与安全 error summary；startup 写入失败时不得启动 child。process 与 ast-grep rule-test Check 不从 Gate Definition closure 或 invocation root 获取路径，也不能写 sibling Check artifact。

### Project Gate 的结构化非零 process Records

这套投影只适用于**已经结算为 nonzero exit** 的 Gate process Check；它不是 generic process adapter 按 command、argv 或人读输出猜测工具语义的机制。process base 仍是 child execution、transcript、four-state outcome 与 generic fallback 的唯一 owner；工具 owner 只负责将自己的已验证 stdout 协议转换为完整的 safe Record 集合；Core 继续是唯一的 Record preview owner。

当前的显式选择只有下表三项。没有列在表中的 process Check 不拥有 structured failure protocol。

| Gate Check     | 工具 owner protocol                                                | 接受后发布的 Record data                                                    |
| -------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `lint-product` | oxlint `--format=json`；只接受 `src/**` 内的诊断                   | `{ kind: "oxlint-diagnostic", path, location, rule, severity, occurrence }` |
| `lint-scripts` | oxlint `--format=json`；只接受 `scripts/**` 内的诊断               | `{ kind: "oxlint-diagnostic", path, location, rule, severity, occurrence }` |
| `format-check` | oxfmt `--list-different`；只接受 `workspaceFormatTargets` 中的路径 | `{ kind: "oxfmt-difference", path }`                                        |

每次适用的 nonzero result 都按以下固定顺序处理：

1. process base 先成功写入完整 settled `checks/<encoded-check-id>/process.log`；若没有 artifact capability、transcript 不能写入、执行被取消、spawn/error、status 为 null 或 timeout，则结算为既有 `unavailable`，不尝试投影。
2. 只有表中 Gate entry 显式提供的工具 owner projector 才可读取该次 stdout。它必须先构造、排序并验证**整组**候选 Records，之后才可替换 generic Record。
3. 任何候选不完整或不安全、unknown field、JSON/path-list 形状错误、workspace/scope/target escape、重复 identity 或 parser exception 都拒绝整组候选；Check 仍失败，并且只发布一个 generic `command-failure` Record。

**oxlint 协议。** closed JSON schema 要求每个诊断具有：

- `error` 或 `warning` severity；
- scope 内 canonical relative path；
- 正 line/column；
- 匹配 `/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?(?:\([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?\))?$/` 的 `code`。

安装的 oxlint 1.78 允许 label 只有 `{ span }`，所以 `label` 可缺失或为 string，但永不进入 Record。

Oxlint 的 `error` / `warning` severity 原样进入 Record；lint invocation 的 `--deny-warnings` 已决定两者都以 nonzero exit 阻断。Gate 不重分级、二次过滤或将这些位置易变的 process diagnostics 接入 Product Finding waiver；规则、scope、directive audit 和例外仍由 `.oxlintrc.json` 与 Oxlint invocation 拥有。

**oxfmt 协议。** 输出必须是完整、非空、无重复的 list-different 路径集合；每行都必须是已授权 target 内的 canonical relative path。

两种工具 owner 都只能发布由 ASCII 字母、数字、`.`、`_`、`-`、`/` 组成的 workspace-relative path；因此 `:`、`@`、`?`、`#`、`=` 等 credential 或 query 风险字符不能进入 data 或 identity。structured Record 与所有 terminal message 均不得复制 child output、tool message/help/snippet、absolute root、command arguments、credential URL 或 digest。结构化 Records 使用本节前述的 Core 默认 preview；工具 adapter 不控制 preview 的条数、排序、截断或文本格式。

没有成功 structured projection 的 process Check，其 failure Record 和 terminal message 只引用 `checks/<encoded-check-id>/process.log`。generic failure Record 的 `command` 是 basename label，不是可执行文件完整路径；完整 command/args 只保留在私有 transcript。Bun test、tsgo、Git whitespace 与 ast-grep rule-test 没有本 Gate 采用的 stable owner protocol，因此保持 generic command failure；ast-grep version mismatch 仍只发布 expected version、固定 mismatch classification、version exit code 与 invocation-relative log reference。Product diagnostic channel、Gate transcript、progress transcript 与 child transcript 各自记录不同层次，不互相解析或复制。

## Gate terminal and transcript

| Channel        | 它包含的事实                                                                                                                           | 它不包含的事实                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `gate.log`     | Gate adapter 的 candidate/selection/aggregation/execution messages、`afterGate` final messages，以及唯一 final directory/result/exit。 | Product progress、Check presentation 与 child output。               |
| terminal       | 一条 candidate/source/selection 启动摘要、Product progress、Gate warning/error、logs path 与最终 result。                              | candidate、aggregation 或 post-processing 的完整 Gate adapter info。 |
| `progress.log` | Product progress owner 生成并与 terminal 双投递的 progress text。                                                                      | Gate adapter transcript 或 child transcript。                        |

Gate 不 patch `console`、`process.stdout` 或 `process.stderr`，也不解析 Product log、machine files、`progress.log` 或 child transcript 来重建结果。
日志关闭与 process exit 由[Gate 结算](project-gate.md#gate-terminal-and-transcript)拥有。
