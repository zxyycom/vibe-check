# repository-tooling

## Case AUX-QUALITY-DOGFOOD-001: Repository callers use the bound Project Run
Owner: `docs/script-tooling.md#repository-project-run`
Entities:
- `bun|scripts/quality/project-run.test.ts|repository Project Run binds its definition before another caller supplies controls`
Proves:
- The repository Run imports and binds the repository Project Definition; another caller supplies only the controls that Run exposes.

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

## Case AUX-TOOLKIT-FOUNDATION-001: Foundation toolkit 的严格解析与失败结果稳定
Owner: `docs/script-tooling.md#工具来源`
Entities:
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > detects failed process results`
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > parses JSON values and normalizes slash paths`
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > parses strict positive integers`
Proves:
- Foundation 的正整数、JSON 与 slash-path helpers 返回确定性归一结果，并拒绝无效输入。
- 失败的 process result 对开发脚本 consumer 保持可观察，不被误判为成功。

## Case AUX-WORKSPACE-PROCESS-001: Foundation process runner 保持纯文本捕获边界
Owner: `docs/script-tooling.md#工具来源`
Entities:
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > runs child processes with plain text output environment`
Proves:
- 开发脚本启动子进程时使用 plain-text / no-color 环境，并返回可判断的 status、stdout 与 stderr。
