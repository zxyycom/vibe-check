# Proposal

本 Change 计划让一次 Project Gate invocation 形成自包含、高信噪的 Run evidence：移除不影响 Gate 结论的嵌套 quality process，并收敛关联 diagnostic 的位置与重复输出。

## Why

Plan 基线中，`repository-quality` 是 Gate 的外层 process Check。它启动一个候选包的 scan-only Project Run，但其中 quality findings 不阻断 Gate；Gate 只得到“该 process completed”的非阻断事实。这个嵌套 Run 增加时间、transcript 与日志层级，却没有向 Gate aggregate 提供可行动结论。

同一基线中的 core diagnostic 虽已是单文件、人工可读的 output，仍有重复 preflight lifecycle 表达、缺少完整 scheduler 决策语境，以及 closing 内的临时状态冲突。测试产生的 diagnostic evidence 也不应落入普通 `.log/project-run` 目录。

## Outcome

完成后，每次 required/full Gate invocation 只运行与 Gate aggregate 或明确 Gate-owned assurance 有关的 Checks，不再启动 `repository-quality` 的嵌套 Run；`bun run quality` 短命令也不再保留。

任何仍被启用 diagnostic 的 Product Run 继续只写一份 core log。Gate bound Run 保持由当前 Gate invocation directory 承接；测试启用的 diagnostic 必须写入 test-owned fixture directory，不能污染普通 `.log/project-run`。日志用一次 preflight resolution、完整 scheduler decision context 和无状态冲突的 closing 表达运行决策；它仍仅供人工排障，不成为 parser 或稳定格式协议。

## Scope

### Intended Change

- 从 Project Gate catalog、selection、process wiring、profiles/tags 与相关 transcript expectation 中移除 `repository-quality`，并删除无独立 consumer 的 `bun run quality` 短命令及其只服务该入口的 wrapper/material。
- 保持 Product diagnostic 为每个 enabled Run 的一个核心人读文件；Gate bound Run 继续使用 Gate-owned invocation directory，测试为其主动启用的 diagnostic 明确选择 test-owned fixture directory，避免测试 artifacts 写入普通 `.log/project-run`。不新建多日志、index、latest、rotation 或 public readback contract。
- 将每个 Check 的 preflight diagnostic 收敛为单个 resolution observation，包含 skipped；保留异常和正常 resolution 所需的安全 details，不再输出重复 started/finished 对。
- 让每个 `SchedulerDecision` observation 完整记录 maxParallel、effectiveMaxParallel、running、blocker、reservation 与既有 decision-specific facts；只调整 human-readable summary，不因字段相同而删减 evidence。
- 使 closing observation 在 logger 未 close 时只用 pending-close 表示 diagnostic output，消除同一 observation 的 pending-close/not-run 双重状态。
- 同步 stable docs、测试、Case/Test Evidence 以及 required/full Gate smoke，使删除的 Gate identity、短命令和目录 owner 不留过时承诺。

### Resulting Impacts

- `scripts/project/gate/**`、`scripts/project/quality/**`、`package.json`：Gate catalog/selection 和短命令入口的删除必须经过 caller audit，不能影响仍由 gate 直接拥有的 candidate、test lanes、docs、catalog 或 git assurance。
- `src/project-run/**`：diagnostic preflight、scheduler、completion 与 output status 的事实 owner 需要保持四态 Check、RunResult、cancellation、logging failure containment 和 Product-private 日志边界。
- Gate/test evidence owner：目录、cleanliness 和 test fixture 生命周期必须由测试/Gate invocation 拥有；不能以普通 runtime log directory 充当测试清理约定。
- `AGENTS.md`、`docs/architecture.md`、`docs/configuration.md`、`docs/script-tooling.md`、`docs/testing.md` 与 Case/Test Evidence：只同步已被实现改变的 Gate entry、private consumer、directory owner、command、membership 与验证陈述；不得把日志正文写成稳定 contract。
- `docs/decisions/consolidate-project-gate-run-evidence.md`、归档的前序 Decision 与 Decision index：本 Change 落实并已核对该长期方向；归档记录只保存形成时基线，不作为当前 owner。

## Success Criteria

1. required/full Gate 的 selected checks 不再包含或启动 `repository-quality`，并且 aggregate/exit 仅由保留的 Gate-owned terminal facts决定。
2. 仓库不再声明或测试 `bun run quality` 短命令；不存在暗示该已删除 workflow 仍受支持的当前 owner 文档或 Case。
3. 每个启用 diagnostic 的 Run 仍只有一份 core log；Gate bound Run 的 evidence 由当前 Gate invocation directory 承接，测试产生的 evidence 可在 test-owned fixture directory 检查，普通 `.log/project-run` 不承接测试 artifact。
4. 每个 preflight path（包括 skipped）产生一次 resolution observation；每个 scheduler decision 保留完整 capacity/blocker/reservation context，且日志不成为公共 parser/schema contract。
5. closing observation 不同时将 diagnosticLogging 表达为 pending-close 和 not-run；关闭后的 status 仍由 RunResult outputs 正确回读。
6. 目标测试、Case/Test Evidence closure、docs/Decision/Change checks 与 required/full workspace Gate smoke 证明上述边界；无关的产品/脚本行为不回归。

## Affected Owners

- `AGENTS.md`、`docs/architecture.md`、`docs/configuration.md` 与 `docs/script-tooling.md`：仓库 Gate entry、private consumer、Run diagnostic directory 与 Product boundary 的 stable owner。
- `docs/testing.md` 与 `docs/testing/cases/repository-tooling.md`：Gate catalog、test-owned diagnostic fixture 与 current Test Evidence owner。
- `docs/decisions/consolidate-project-gate-run-evidence.md` 及 Decision index：已对齐的长期方向；`docs/decisions/archive/add-ephemeral-project-run-diagnostic-logging.md` 只保留其形成时的 diagnostic 基线。
- `scripts/project/gate/**`、`scripts/project/quality/**`、`src/project-run/**` 及相邻 tests：本 Change 的 implementation 和 local executable evidence。

## Current Completion

本 Change 仍是 active `plan`，16/16 tasks 已按实际实现与验证勾选完成。`repository-quality` Gate wrapper 与 `bun run quality` 已删除，稳定 owner、Case 和已对齐 Decision 已同步。checkbox、Decision alignment 或任一通过的检查都不授予归档或 Git 提交；归档、暂存和提交须由后续任务明确授权。
