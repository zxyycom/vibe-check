> **核心句：**本 change 在未来用 Product-owned TypeScript backend 替换 function metrics 的 Python/Lizard runtime，并以实施前重新采集的 Check/Record 行为基线约束兼容性。

## Why

历史实现让 formal function-metrics path 依赖外部 Python/Lizard process 和私有解析协议，增加运行环境与维护负担。统一到 Product-owned TypeScript runtime 仍有长期价值，但当前 Check、Record、任务编排和 Project Definition 基础正在重建，继续维护旧迁移细节只会制造错误约束。

## What Changes

- 最终让 `function-metrics` built-in Check 使用 Product-owned TypeScript structural-analysis backend，不再要求 formal product runtime 启动或解析外部 Python/Lizard。
- Backend replacement 以恢复实施时重新采集的 current behavior 为准，保持 supported inputs、function identity、measurement、ordering、CheckResult、QualityRecord 与 failure semantics；本 change 当前不固定这些 contract 的精确 shape。
- Parser/source translation、upstream provenance、许可证处理、兼容 corpus、性能目标和切换方式都在实现前阻塞审计中基于届时事实细化。
- Backend 保持 `function-metrics` Check 的私有实现，不定义新的公共 provider、配置、输出或 fixture contract。
- 本 change 明确延期；三个基础 change 与 TypeScript Project Definition 实际落地并完成重新基线前不得实施。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `structural-scanning`: 将 function metrics 的私有 backend 迁移到 Product-owned TypeScript 实现，并以届时 `quality-checks` / `quality-records` contract 保持行为兼容。

## Impact

- 未来影响 function-metrics Check 的 scanner dependency、parser implementation、source/license provenance 和行为验证材料。
- 不主动修改 Check/Record Core、共享调度、Project Definition、公共 decision policy 或 output owner；这些基础只由本 change 消费。
- 当前 artifacts 只用于保留方向与风险，不能作为 port 实施说明。
