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
- An ancestry-external temporary Bun consumer installs the accepted tarball, typechecks the approved public operations, values, and type roots (including final-snapshot `RunResult.checkDurations` without a new named type root), then completes a minimal `duplicateDetection` Run using a `jscpd` manifest and declared bin resolved from that consumer's installation rather than repository sources or dependencies.
- That consumer uses default-enabled Product progress with a real non-TTY stdout capture: human output contains the Check total, settled completion, and final execution summary without terminal control bytes; its executed canonical Check has one non-negative finite `checkDurations` entry.
- A preparation failure returns an infrastructure failure before the repository scan starts, so a stale installed candidate is never used as fallback.

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

## Case AUX-WORKSPACE-TASK-ENGINE-ADAPTER-001: Workspace scripts fields 只经本地 adapter 进入 shared engine
Owner: `docs/script-tooling.md#工具来源`
Entities:
- `bun|scripts/vibe-check-workspace/task-engine-adapter.test.ts|workspace task engine adapter > projects scripts-owned command fields into one graph without leaking them into the engine`
- `bun|scripts/vibe-check-workspace/task-engine-adapter.test.ts|workspace task engine adapter > rejects malformed dynamic Check authoring before task-graph projection`
Proves:
- Workspace verifier 先在 scripts-owned group/leaf authoring boundary 拒绝缺失 command、混合 group/leaf 字段和 malformed dynamic values，再把 dependency/mutex 投影为 graph；command、args、environment 和 report fields 留在 adapter 外，shared engine 不获得 Product Check/Core 或 scripts execution semantics。

## Case AUX-WORKSPACE-VERIFIER-PROFILE-001: Full verifier 保持显式的 product 与 toolkit package gates
Owner: `docs/script-tooling.md#配置所有权`
Entities:
- `bun|scripts/vibe-check-workspace/checks/definitions.test.ts|workspace verifier profiles > keeps full-only product and toolkit package gates explicit`
- `bun|scripts/vibe-check-workspace/checks/definitions.test.ts|workspace verifier profiles > prepares the package candidate before every repository package consumer`
Proves:
- `full` 保留所有 required non-quality checks、去掉 quick quality dogfood，并显式加入 full dogfood、完整 Product `test -- product` 入口和 foundation 的 typecheck、lint、`format -- check`、test package commands。部分源文件层验证会与 required 重叠，但这些独立 command 仍证明 toolkit 自身的 cwd、配置与 package-script boundary 可执行。
- 唯一的 locked-Bun candidate preparation task 先完成；scripts typecheck、semantic Case check 和两个 quality consumer 都显式依赖它，因此 verifier 不会并行 build、pack 或 install candidate。

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
