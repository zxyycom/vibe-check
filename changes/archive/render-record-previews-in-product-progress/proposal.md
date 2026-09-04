# Proposal

将默认 Record 预览从 Project Gate adapter 收敛到 Product progress rendering，作为可复用的受管输出计划。

## Why

Native Gate 的 owner-safe diagnostic Records 已经完整发布，但其预览只在一个 private adapter 内实现；同一 diagnostic 又作为 message 输出，其他 Check 的 Records 没有默认终端入口。

## Outcome

任一 Check 已接受的 Records 与 messages 在 progress settled block 中分别获得五条、有长度边界的预览；完整事实仍只存在于 snapshot、RunResult 与 machine publication，各 producer 不再复制通用 Record preview。

## Scope

### Intended Change

在 Product 的 Core session、Check execution lifecycle 与 progress renderer 之间增加完整 accepted Record 的私有 handoff；在 renderer 对 Records 与 messages 各自执行五条和 Unicode code point 长度边界；删除 Native Gate adapter 的 diagnostic preview message，仅保留独立 focused command message；演进相应长期 Decision 并同步当前 owner 文档与测试证据。

### Resulting Impacts

Core/Run/machine facts、Check callback API、Record schema 与 machine v4 不改变。受影响的 progress、Core session 与 Gate native 测试及其 Case prose 必须证明完整事实不受显示上限影响；架构、配置和质量 owner 必须说明 generic presentation 只渲染 structural Record identity 与 canonical JSON。

## Success Criteria

- 所有 settled Check 的 accepted Records 在 enabled Product progress 中获得默认有界预览；Records 与 messages 每类各最多五条，且各自的省略计数和每条 terminal-control-escaped text 的 240 Unicode code-point 截断（含 marker）正确。
- attention passed Check 只要有 Record 或 message 即可见；完整 snapshot records、machine records 与 `RunResult.checkMessages` 不受 terminal truncation 影响。
- Native adapter 不再为逐项 diagnostic 生成 messages，且其 Records、focused command message、fail-closed 和 transcript 边界保持正确。
- Change、Decision、测试证据、docs、type/lint/format 与日常 Gate 验证通过；不运行 `check -- --all`。

## Affected Owners

`docs/architecture.md`、`docs/configuration.md`、`docs/quality-metrics.md`、`docs/testing.md` 与 `docs/testing/cases/scan-configuration.md` 定义产品运行、输出、Check facts 与证据；`docs/decisions/` 保存长期方向；`changes/` 保存本次实施计划。实现 owner 为 `src/check-settlement/**`、`src/project-run/check-execution/**`、`src/project-run/progress-rendering/**`，以及 `scripts/project/gate/checks/process/native-operation.ts`。
