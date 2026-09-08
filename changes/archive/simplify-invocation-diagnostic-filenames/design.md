# Design

以 invocation-only 的封闭文件命名选择满足 Gate 独占目录场景，默认共享目录继续使用唯一后缀。

## Context

2026-09-08 用户确认只优化已有日志命名，不统一 Product 目录布局。实施前基线为 `90a4d4232b4d2a1cbf1f33ef45a995ff56667938`。

- Gate 已先建立 exact invocation evidence root，再通过 installed package public `run(definition, controls)` 绑定输出；没有允许 Gate 注入 Product-private path policy 的内部通道。
- `createInvocation` 生成 UUID、output timestamp 与 diagnostic suffix；`paths.ts` 决定目标，logger 用 `openSync(file, "wx")` 独占创建，readback 从实际 resolved targets 派生。
- 普通调用方可以复用 diagnostic directory。独占目录与共享目录的差异由 caller 明确选择，不能从路径外观推断。
- 稳定职责见 [Project Run](../../../docs/development/project-run.md)、[人读输出](../../../docs/development/human-output.md)与[Project Gate](../../../docs/tooling/project-gate.md)。

## Goals / Non-Goals

**Goals**：Gate 中固定 Core/Scheduler basename；保留普通默认行为、防覆盖、per-channel failure/readback 与真实 correlation。

**Non-Goals**：不重新设计 output directory，不新建 Product invocation 子目录，不统一 Gate/Product identity，不公开 filename callback/任意 basename，不增加覆盖/追加/cleanup/rename，不改变 machine publication 或 progress transcript。

## Decisions

### Intended Change

- 采用 `RunControls.diagnosticLogFileNaming?: "unique" | "channel"`。这是同一次 invocation 的 path control，与 `progressLogFile` 同层；不是 Definition policy 或 outputs override，避免改变已有同型 merge/fingerprint 契约。
- 省略或显式 `unique` 使用现有 `core-<utc>-<uuid>.log`、`scheduler-<utc>-<uuid>.log`；`channel` 使用 `core.log`、`scheduler.log`。只覆盖文件名，不修改 directory resolution。
- controls 的唯一 closed validator 验证两 literal；非法值返回 `invalid-run-controls` 与 `controls.diagnosticLogFileNaming`，即使 diagnostic disabled 也验证。内部 path owner 只消费已校验值。
- Gate 的 `projectGateInvocationOutputControls` 显式提供 `channel`；普通调用方不因使用相似路径自动进入此模式。
- logger 保持独占创建。target 已存在时该 channel failed，不覆盖、不追加，也不退回随机文件名；两 channel 独立，不承诺整组原子占用。同目录竞争可能分别失败或只成功部分 channel，仍按原 readback/status 表达。
- UUID、invocation correlation、sequence、elapsed 与 machine timestamp 不因文件名缩短而删除；controls 不进入 Definition fingerprint，RunResult 形状不扩展。

候选比较：全局固定名会破坏共享目录的日常成功行为；Product 自建目录超出当前目标；Gate 写后 rename 会破坏 writer/readback；private/env/path-sniffing 通道会绕过正式 package 边界。因此采用显式 invocation-only 变体，而不建立另一套 output 系统。

### Resulting Impacts

- 更新 RunControls type/parser/projection、Invocation 创建和 paths，保持 output defaults 与 Definition validation 不变。
- Gate 中央 controls 的返回类型与 exact object/inventory tests 同步；最终 root Gate 通过 exact installed candidate 证明实际文件布局。
- 用户说明覆盖启用方式、默认兼容、exclusive target 与失败 readback；内部说明解释 path/identity/writer ownership，Gate 文档展示固定布局。
- Tests 覆盖默认/显式 unique、channel、非法值、disabled、同目录重复/并发、防覆盖、per-channel readback、facts/fingerprint，以及原有 write/close failure。并发用 barrier 而不是 sleep。

## Risks / Trade-offs

- `channel` 不是证明目录独占的安全能力；caller 必须为本次 Run 提供合适目录。Product 只保证 exclusive-create 不覆盖，不能阻止 caller 的其它进程事后修改文件。
- 两 channel 不组成事务。部分已存在或跨进程竞争保持现有独立 channel failure，不引入 lock、rollback 或目录 ownership protocol。
- 人读日志仍不是 machine parser contract；文件名模式不提升日志内容稳定性。

## Open Questions

用户范围已闭合，无待决产品问题。技术选择、实施 diff 与文档已由非实施代理反查。2026-09-08 用户后续明确授权在 AI-ready 文档与完整编码规范审查通过后归档并提交 Git；不包含发布或远端写入授权。

长期边界由 [允许 invocation controls 选择 channel-only 日志名](../../../docs/decisions/allow-channel-only-diagnostic-filenames-in-invocation-controls.md) 记录。
