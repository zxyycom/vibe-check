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

### 两种 command transcript owner

Gate 有两条互不混用的 command 路径：

| 路径 | 当前 Check | transcript 与 failure owner |
| --- | --- | --- |
| private process adapter | `typecheck-*`、`lint-scripts`、`format-check`、test lanes、`git-diff-whitespace` | `scripts/project/gate/checks/process/**` 拥有 running/final format、`transcript-unavailable` 和 generic fallback。 |
| Product `commandCheck` | `lint-product`、`prepared-external-package-consumer` | Product 拥有 `process.log` format 和 `command-transcript-unavailable`；Gate 只拥有 completion callback 的领域结果。 |

private adapter 从自己的 `CheckExecutionContext.artifactDirectory` 取得路径能力，启动 child 前写 running transcript，结算后以自己的 command、stdout/stderr、exit/signal/timeout 与安全 error summary 格式改写。没有 capability 时它以 adapter 的 `transcript-unavailable` fail closed。其格式、reason code 与 fallback 不属于 `commandCheck` contract。

private adapter 的结构化 nonzero projection 只适用于明确选择该 projector 的 entry，不根据 command、argv 或人读输出猜测工具语义：

| Gate Check | 工具 owner protocol | 接受后发布的 Record data |
| --- | --- | --- |
| `lint-scripts` | oxlint `--format=json`；只接受 `scripts/**` 内诊断 | `{ kind: "oxlint-diagnostic", path, location, rule, severity, occurrence }` |
| `format-check` | oxfmt `--list-different`；只接受 `workspaceFormatTargets` 中路径 | `{ kind: "oxfmt-difference", path }` |

projector 必须先构造、排序和验证完整候选 Record 集合。unknown field、JSON/path-list 形状错误、scope/target escape、重复 identity 或 parser exception 会拒绝整组候选；entry 保持 failed，并只发布一个 generic `command-failure` Record。generic Record 与 terminal message 只引用 `checks/<encoded-check-id>/process.log`，且只使用 basename command label。Bun test、tsgo、Git whitespace 与 ast-grep rule-test 没有 stable owner protocol，保留 generic adapter failure。

oxlint projector（`lint-scripts` 及下文的 `lint-product`）只接受 scope 内 canonical relative path、正 line/column、`error`/`warning` severity 和安全 `code` grammar；label 不进入 Record。oxfmt projector 只接受完整、非空、无重复的已授权 target path。两者只发布由 ASCII 字母、数字、`.`、`_`、`-`、`/` 组成的 relative path；child output、tool help/snippet、absolute root、arguments、credential URL 与 digest 不进入 Record 或 terminal message。Core 拥有 structured Record preview。

### 已迁移的 commandCheck consumers

`lint-product` 与 `prepared-external-package-consumer` 不经过 private adapter。二者选择 `output: { mode: "transcript" }`，因此 `checks/<encoded-check-id>/process.log` 使用 Product format：running 为 `status=running`；final command status 后是 `stdout:` 和 `stderr:` 段。这个 status 是 Product 的 command terminal classification，不是 callback 可能返回的最终 Check outcome。final write 必须先于 `afterCommand`；没有 artifact capability 或写入失败时，Product 结算 `unavailable / command-transcript-unavailable`，不调用 Gate callback。

`lint-product` 的 completion callback 只在完整 numeric exit 后运行：exit `0` 结算 passed，nonzero 可由 Gate-owned oxlint projector 形成 safe Records，或回退为 Gate-owned generic failure，并维持 commandCheck 的 Product transcript 引用。这个 callback/projection 不是 private adapter schema。

`prepared-external-package-consumer` 是 typed provider。其完整 nonzero exit 不表示 generic failed process Check：callback 保留安全的 generic command-failure message/log reference，但将 provider 结算为 `unavailable / external-consumer-provider-failed`，因为没有可发布的已验证 external-consumer material。exit `0` 时才解析 stdout、验证物理材料及其 candidate/provenance；解析或验证失败为 `unavailable / process-output-invalid`。这两个 external-consumer reason code 是该 consumer 的专有 result contract，不是 Product `commandCheck` unavailable code。

Product diagnostic channel、Gate transcript、progress transcript、private adapter transcript 与 Product `commandCheck` transcript 各自记录不同层次，不互相解析或复制。

## Gate terminal and transcript

| Channel        | 它包含的事实                                                                                                                           | 它不包含的事实                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `gate.log`     | Gate adapter 的 candidate/selection/aggregation/execution messages、`resultContributor` final messages，以及唯一 final directory/result/exit。 | Product progress、Check presentation 与 child output。               |
| terminal       | 一条 candidate/source/selection 启动摘要、Product progress、Gate warning/error、logs path 与最终 result。                              | candidate、aggregation 或 post-processing 的完整 Gate adapter info。 |
| `progress.log` | Product progress owner 生成并与 terminal 双投递的 progress text。                                                                      | Gate adapter transcript 或 child transcript。                        |

Gate 不 patch `console`、`process.stdout` 或 `process.stderr`，也不解析 Product log、machine files、`progress.log` 或 child transcript 来重建结果。
日志关闭与 process exit 由[Gate 结算](project-gate.md#gate-terminal-and-transcript)拥有。
