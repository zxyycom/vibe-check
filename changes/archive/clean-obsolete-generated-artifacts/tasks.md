# Tasks

本 Plan 按已确认范围先完成 fixture isolation，再以直接测试和语义账本闭合验证。

## Readiness
- [x] 0.1 读取 Project Run、Project Definition、Output、Project Gate、测试策略、Case 维护与相邻 Process Check 测试，确认旧字段、cwd fallback、default publication 和既有 Case 的责任边界。
- [x] 0.2 在修改前运行完整 Test Evidence check，确认 current entity/Case closure 起点通过。
- [x] 0.3 将已授权范围、非目标、设计和验证任务收敛为 Plan，并记录实施阶段不与 cold candidate 实验并发运行 Gate/build/install、且不再清理 artifacts 的限制；最终集成 Gate 由 2.5 承接。

## Implementation
- [x] 1.1 将既有 nonzero-exit Process Check public Run fixture 改为 current disabled machinePublication control，并传入其 test-local projectRoot。
- [x] 1.2 为同一 Run 保留 safety assertions，新增 disabled output status 和 test-local default publication absence 的直接证据。
- [x] 1.3 更新 `AUX-PROJECT-GATE-PROCESS-001`，使既有 Case 的 Proves 包含该实体的 invocation-local publication isolation，而不改变 Case identity 或实体映射。

## Verification
- [x] 2.1 运行目标 Process Check Bun test，确认安全 failure、records、progress 和 isolated disabled publication evidence。
- [x] 2.2 修改后运行完整 Test Evidence check，确认实体、Case 和 owner 映射闭合。
- [x] 2.3 运行本 Change Plan check 并审阅局部 diff，确认只包含批准的测试、Case 与 Plan artifacts；实施阶段不与 cold candidate 实验并发运行 Gate/build/install，最终集成 Gate 由 2.5 承接。
- [x] 2.4 独立正确性审查确认 temporary `projectRoot`、disabled 状态与 test-local absence 共同证明本 fixture 的隔离，既有安全断言和 Case 义务未弱化；最终 AI-ready/代码可推理审查未发现需改测试正文的语义障碍。
- [x] 2.5 在 cold candidate 串行阶段结束后的稳定 combined 工作树运行 `bun run check`：31 passed、5 not applicable、0 failed/unavailable；该共享集成证据不替代本 Change 的独立归档与提交。
