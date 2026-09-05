# Design

本设计将纯 observation 渲染移到同一 diagnostic-logging owner 内的具名模块，而保留 logger 的 channel routing 和 filesystem writer lifecycle；它以可审计的迁移与现有行为测试支撑“已覆盖场景的字节不变”。

## Context

`docs/api-mechanics.md#outputs-与-runresult-边界` 规定 enabled diagnostic logging 以 core、scheduler 与 conditional learned-admission 三条显式 owner channel 写入；router 在每次委托前赋予跨 channel sequence、monotonic elapsed 和 invocation ID，且最后可写事件后才 close。`docs/architecture.md#output-and-downstream-boundary` 将 router 的 correlation、channel route 和 per-channel setup/write/close containment 归给 `diagnostic-logging/**`。

当前 `logger.ts` 的 406 code lines 超过 300 file metric 上限。已存在的 `diagnostic-detail-rendering.ts` 只负责 descriptor-safe JSON projection；`logger.ts` 仍拥有把该 projection 展开为人读 facts，以及 header escaping、elapsed display 和 continuation line splitting。

## Goals / Non-Goals

**Goals**

- 明确分隔 observation presentation 与 writer lifecycle，消除该 file-metric finding。
- 保持已覆盖日志样例的 exact output bytes、sequence/correlation、failure isolation、close ordering 与 Run result。
- 让交接者能分别识别职责迁移证据、行为测试证据与未覆盖边界，而不把任一单项证据误读为全输入空间证明。

**Non-Goals**

- 不改变 `finalizeInvocation` 或任何 invocation/completion 顺序。
- 不改 scheduler/admission、learned-policy observation producer、diagnostic detail safety algorithm、limits、public API、output schema、callback logger 或 generic event bus。
- 不新增、删除、重命名或修改 tests/Cases；也不以本 Change 执行 default/full Gate、归档或提交。
- 不声称已对所有可能 observation、时钟值或 writer failures 完成穷举或形式化的 byte-for-byte equivalence 证明。

## Decisions

### Intended Change

1. 新建同目录的 `observation-rendering.ts`，唯一导出 writer 使用的 pure `renderDiagnosticObservation`。它承接原 `renderObservation` 的 header/fact formatting、control/`[]`/backslash escaping、safe rendered detail flattening、tag duplicate omission、inline/physical line bounds、surrogate-safe chunks、elapsed formatting和 final newline。
2. `logger.ts` 保留 `DiagnosticObservation` 类型、router、routed delegates、direct descriptor lifecycle、direct local sequence、safe clock/elapsed 和 byte append。direct logger 在原 `writeBuffer` 前以未改写的 `{ elapsedMs, invocationId, observation, sequence }` 调用 renderer；render failure 仍由既有 writer `try`/`catch` 标记 failed。
3. 新模块仅 type-import `DiagnosticObservation`，避免引入 runtime circular dependency；它继续调用现有 `renderSafeDiagnosticDetail`，不复制或改变 depth 16、width 4096、value 32768、chars 1048576 的 safety boundary。
4. 字节不变主张只适用于原 formatter 的已覆盖输入。审阅 source diff 时，确认旧函数整体删除、新模块保留同一语句算法与常量、且调用仍在原 append 之前；运行现有 logger formatting tests 检查已断言的精确文本。两者缺一不可：diff 证明迁移边界，tests 证明代表性运行时输出。

### Resulting Impacts

- `logger.ts` 的行为入口改为调用 renderer，但 render input/output 与 error containment 均保持内部、同步且 deterministic；只有 renderer 返回的 buffer 交给原 `writeBuffer`。
- 现有 test entity 已直接观察 safe descriptors、omitted facts、escaping、bounded continuation/newline、router sequence 与 isolated setup/close failures；纯 relocation 不新增独立 Case 或测试正文。
- 定向 quality execution 应消除准确的 `src/project-run/diagnostic-logging/logger.ts` `code-lines` Record；如出现新 Record，必须先修复或在交付中如实说明，不能视为完成。

## Risks / Trade-offs

- 字符串 formatting relocation 容易引入字节漂移。风险控制是保留算法/constant values、检查局部 diff，并执行现有精确格式化断言；这些证据不能覆盖测试没有构造的任意 value、时间或 OS write 行为。
- 本 Plan 不新增 byte-for-byte differential/fuzz harness，因为目标是纯 source relocation 且现有 tests 已覆盖该 formatter 的 contract 边界；若 diff 不是机械迁移，或任一格式化断言失败，则必须扩展验证或重新界定 Change，不能以此 Plan 的现有证据宣称字节不变。
- type-only import 是刻意的内部依赖方向；它不形成 runtime module initialization cycle。
- 全局 Gate 会扩大到不相关 owner；本 Change 只运行指定的最窄产品与 quality checks。未运行 default/full Gate 不表示全仓库 aggregate 已通过。

## Open Questions

无。

## Implementation Observations

2026-09-05：局部 diff 显示原 rendering block 从 `logger.ts` 移至 `observation-rendering.ts`；public producer、router/lifecycle 与 tests 未改。`logger.ts` 为 261 行、新模块为 203 行，均低于 300。共置 logger 与 invocation diagnostic tests 共 16 项通过；focused `--quality` Gate 的 machine evidence 显示 file-metrics 为 8、function-metrics 为 27、duplicate 为 1，共 36 个 non-blocking findings，且 `logger.ts` 不在 8 个 file-metrics Records 中。该记录是当次执行证据，不替代本 Plan 所界定的未覆盖输入边界。
