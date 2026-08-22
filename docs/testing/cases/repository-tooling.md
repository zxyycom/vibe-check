# repository-tooling

## Case AUX-QUALITY-DOGFOOD-001: Repository callers use the bound Project Run

Owner: `docs/script-tooling.md#repository-project-run`
Entities:

- `bun|scripts/quality/project-run.test.ts|repository Project Run binds its definition before another caller supplies controls`
  Proves:
- The repository Run imports the installed public `vibe-check` entry, binds the repository Project Definition, and lets another caller supply only the controls that Run exposes.

## Case AUX-PACKAGE-CANDIDATE-001: Candidate preparation builds one auditable physical package

Owner: `docs/script-tooling.md#repository-project-run`
Entities:

- `bun|scripts/package-candidate/index.test.ts|package candidate preparation > prepares a physical candidate lifecycle`
- `bun|scripts/package-candidate/isolated-consumer.test.ts|accepts a candidate in an external consumer`
- `bun|scripts/package-candidate/run-quality.test.ts|candidate-backed quality workflow > does not start the repository scan when candidate preparation fails`
  Proves:
- The candidate owner derives one local package with only the approved runtime exports, declared package dependencies, a physical consumer install, and a resolved installed entry.
- A matching receipt reuses the existing build/pack/install state; a malformed receipt is never trusted and causes preparation to rebuild before returning a consumer entry.
- A missing candidate-owned `jscpd` closure is not satisfied by ancestor resolution: preparation reinstalls before returning a repository consumer entry.
- An ancestry-external temporary Bun consumer installs the accepted tarball, typechecks the approved public operations, values, and type roots (including explicit aggregation, four-state custom final data with terminal messages, `attention` visibility, two-argument supplemental Record reporting, and final-snapshot `RunResult.checkDurations` / `checkMessages` without new duration or message type roots), then completes a minimal `duplicateDetection` Run using a `jscpd` manifest and declared bin resolved from that consumer's installation rather than repository sources or dependencies.
- That consumer uses default-enabled Product progress with a real non-TTY stdout capture: lifecycle output contains the Check total, settled completion, an `attention` Check's message, and final execution summary without terminal control bytes; its executed canonical Checks have non-negative finite `checkDurations` entries, observable final data, and structured `checkMessages` readback.
- A preparation failure returns an infrastructure failure before the repository scan starts, so a stale installed candidate is never used as fallback.

## Case AUX-PROJECT-GATE-CATALOG-001: Project Gate 的 catalog、root binding 与 controls 闭合

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project-gate/index.test.ts|Project Gate catalog, root binding, and controls > binds retained workspace verification names directly to the Gate profiles without disabled tags`
- `bun|scripts/project-gate/index.test.ts|Project Gate catalog, root binding, and controls > keeps the independent 20-Check required/full profile contract closed`
- `bun|scripts/project-gate/index.test.ts|Project Gate catalog, root binding, and controls > normalizes a profile plus repeatable disabled tags into opaque flags`
- `bun|scripts/quality/project-gate/project-definition.test.ts|Project Gate Definition > projects every catalog command into one process Check without a policy`
- `bun|scripts/quality/project-gate/project-definition.test.ts|Project Gate Definition > binds required, full, and partial eligibility selections to explicit aggregation`
  Proves:
- 保留的 `verify:vibe-check-workspace`、`:required` 与 `:full` root names 分别直接调用 Project Gate default/full、required 与 full profiles，且正式 target 不传 disabled tags。
- 独立 catalog 的 20 个 Check 及 required/full membership 闭合；Definition 将每个 catalog 条目投影为一个 process Check，并将同一 eligibility selection 提供给 explicit aggregation。
- adapter 只接受合法 profile 与重复 disabled tag，并将其规范化为 opaque flags；disabled tags 只留给 direct local partial invocation。

## Case AUX-PROJECT-GATE-PROCESS-001: Project Gate 保留命令与 transcript 事实

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/quality/project-gate/process-check.test.ts|Project Gate process Check > writes one complete transcript and passes only a zero command exit`
- `bun|scripts/quality/project-gate/process-check.test.ts|Project Gate process Check > reports a safe failure Record and command-failed message for nonzero exit without copying child output`
- `bun|scripts/quality/project-gate/process-check.test.ts|Project Gate process Check > avoids starting N/A or cancelled work and maps process/log boundaries to unavailable`
- `bun|scripts/quality/project-gate/process-check.test.ts|Project Gate process Check > cancels an already-started process and preserves its transcript`
  Proves:
- eligible command 只有在零退出并写入包含 stdout/stderr 的 per-Check transcript 后才通过。
- 非零退出产生含 command、exit code、signal 与 log reference 的 Check-local supplemental Record，随后得到 failed final data 和唯一 `error` / `command-failed` message；message 只含 exit code、signal 和 transcript basename，不复制 child output、完整路径、command、credential URL 或 digest。
- The same nonzero Check executed through the installed public Run keeps its failure Record, presents only that approved summary, and returns the identical structured item from `RunResult.checkMessages`; transcript-only material remains absent from both surfaces.
- profile/tag N/A 与启动前取消不启动 process；spawn、exit facts 或 transcript 边界失败得到对应 unavailable outcome。
- 已运行 command 被取消时，transcript 保留 signal 与 error summary，outcome 为 `execution-cancelled` unavailable。

## Case AUX-PROJECT-GATE-ADAPTER-001: Project Gate 只闭合已准备的完整 invocation

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project-gate/index.test.ts|Project Gate adapter closure > does not load or run a candidate consumer after preparation failure`
- `bun|scripts/project-gate/index.test.ts|Project Gate adapter closure > rejects an imported entry that differs from the prepared candidate before log/run`
- `bun|scripts/project-gate/index.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project-gate/index.test.ts|Project Gate adapter closure > maps aggregate, definition warning, effect and malformed facts to Gate exits`
  Proves:
- preparation failure 或 prepared/imported entry mismatch 均在 consumer execution 前停止；mismatch 也在 invocation log 创建前停止。
- exit `0` 要求 Package Run 的 explicit aggregate 为 passed；definition warning、progress failure 或非-passed aggregate 为 `1`，non-completed 或 malformed result 为 `2`。adapter 不遍历 snapshot 重建质量结论。

## Case AUX-PARALLEL-RUNNER-001: Static Task engine 保持通用调度契约

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > validates static task identity dependency and scope structure before execution`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > uses one root budget for dependency order and named mutex admission`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > uses the minimum active cap and reserves capacity for a newly ready tighter scope`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > does not activate a cap for a scope with no activation task`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > settles executor failures and blocks only their dependent tasks`
- `bun|src/product/task-scheduler/test/task-engine.test.ts|static task engine > stops new admission after abort while admitted work receives the same signal and drains`
  Proves:
- Engine 在任何 executor work 前验证静态 Task identity、dependency、scope membership、activation/terminal relation 和 cap；它以一个 root budget 处理 dependency、mutex 与 generic scope cap。
- Executor failure 只阻断 dependent Task，unrelated Task 仍可完成。abort 后不再 admission pending Task，已 admitted Task 接收同一 signal 并 drain；engine 的 settlement 是唯一通用 execution accounting。

## Case AUX-TOOLKIT-FOUNDATION-001: Foundation toolkit 的严格解析与失败结果稳定

Owner: `docs/script-tooling.md#工具来源`
Entities:

- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > detects failed process results`
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > keeps file traversal deterministic and reports filesystem and JSON boundaries`
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > parses JSON values and normalizes slash paths`
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > parses strict positive integers`
  Proves:
- `parsePositiveInteger` 与 JSON parser 拒绝无效输入；`toSlashPath` 返回确定性 slash-normalized 路径。
- Foundation 文件遍历按稳定的相对路径顺序返回；无法读取目录、读取/解析 JSON 文件时包含目标路径，序列化 JSON 文件或 NDJSON record 时标识失败对象，不会静默跳过边界失败。
- 失败的 process result 对开发脚本 consumer 保持可观察，不被误判为成功。

## Case AUX-WORKSPACE-PROCESS-001: Foundation process runner 保持纯文本捕获边界

Owner: `docs/script-tooling.md#工具来源`
Entities:

- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > runs child processes with plain text output environment`
  Proves:
- 开发脚本启动子进程时使用 plain-text / no-color 环境，并返回可判断的 status、stdout 与 stderr。

## Case AUX-WORKSPACE-PROCESS-CANCELLATION-001: Foundation process runner 保留运行中取消事实

Owner: `docs/script-tooling.md#工具来源`
Entities:

- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > cancels an already-started child process`
  Proves:
- 已运行 child 收到 caller 的 `cancelSignal` 后终止；其结果保留 `error`、`SIGTERM` 与 `status: null`，不被误判为成功。
