# Proposal

只简化调用方已拥有独占运行目录时的 Core/Scheduler diagnostic 文件名，保留普通 Product 默认布局。

## Why

实施前 Gate 已建立独立 invocation evidence root，但其中 Core/Scheduler 日志仍附加时间和 Product UUID；目录已经提供运行分组，重复后缀增加定位成本。普通 Product 的 diagnostic target 可能由多个 Run 共享，不能全局删除后缀。

2026-09-08 用户确认推进且只处理这几个命名问题，不改变普通用户的目录布局。

## Outcome

Gate 的独占运行目录直接包含 `core.log`、`scheduler.log`；普通 Product 默认继续生成带唯一后缀的文件。两种模式都不覆盖或混写已有文件，实际目标与失败状态仍从原有 output readback 读取。

## Scope

### Intended Change

增加 invocation-only `RunControls.diagnosticLogFileNaming?: "unique" | "channel"`。省略使用 `unique`；`channel` 只选择两个既有 channel 的固定 basename。Gate 在既有中央 output-controls 入口显式选择 `channel`，不新增目录、重命名流程或通用 filename hook。

### Resulting Impacts

- 更新 closed controls validation、invocation path resolution 与 Gate bound controls；不把该选项加入 Definition/outputs/fingerprint。
- 保持 UUID correlation、timestamp、每 channel exclusive create、失败隔离、close 与 readback；不增加多文件原子占用承诺。
- 同步用户/内部/Gate 文档、声明和相关 Case，运行 Product 与 exact installed Gate consumer 证据。

## Success Criteria

1. 默认省略与显式 `unique` 保持原命名；Gate `channel` 仅产生固定 Core/Scheduler 文件，不额外创建子目录。
2. 无效命名值在 author work 前得到 `invalid-run-controls`；disabled diagnostic 不创建文件。
3. 重复或并发误用同一 channel target 不覆盖或追加，失败按原 channel status 可观察，已接受 Check facts 不受影响。
4. readback 指向真实文件，UUID correlation 与 Definition fingerprint 保持各自含义，既有失败优先级不变。
5. 目标测试、Test Evidence、类型/lint/format、文档及完整 installed-consumer Gate 通过；非实施代理从实际 diff 反查用户与内部说明。

## Affected Owners

- [Project Run](../../../docs/development/project-run.md)、[人读输出](../../../docs/development/human-output.md)、[API 机制](../../../docs/api-mechanics.md#outputs-与-runresult-边界)、[Project Gate](../../../docs/tooling/project-gate.md)。
- `src/project-run/controls/**`、`src/project-run/invocation/**`、既有 diagnostic logger 与 `scripts/project/gate/definition.ts`。
- 对应 controls/diagnostic/Gate tests、Case 与 installed package acceptance。
