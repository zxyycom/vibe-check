# Design

以稳定验收责任划分反馈档位，选择与预算分别由 Gate 单一事实源投影。

## Context

当前 main 为 446ce435，765 测试实体 / 190 Cases 闭合。起点默认 required 实际为 32 passed / 11 not-applicable，最终因总时长 32105.7 ms、均值 2338.3 ms、P95 5300.7 ms 超标而 exit 1。既有 all 的完整验收不因本次分层移除。

## Goals / Non-Goals

让日常反馈更小、交付覆盖明确且性能标准统一。不是减少实际验收、不承诺同工作量提速，不引入缓存、依赖、Product API、watchdog 或自动重试，不放宽既有预算。

## Decisions

### Intended Change

1. 默认 fast、显式 changed/all 独占选择，focused 维持可组合工具子集；receipt 仍只与 all 组合。
2. fast 资格包含 typecheck/lint 两 scope、format、prepared candidate、selection 与 package-tools boundary 两条既有测试 lane、Git whitespace。candidate/whitespace 固定，其余按输入 region；不把一次实测耗时当作资格判据。
3. changed 消费全部既有 lane 与质量/材料/Case 选择，并按 package 输入选 artifact/consumer；共享输入、未知路径与不可用 Git 证据保持保守。all 始终选择完整 manifest。
4. `performance-policy.ts` 固定 fast/changed 总时长 30000 ms、all 90000 ms；三档均值 2000 ms、P95 5000 ms。运行时只作为安全诊断事实。focused 不是验收，不评估这些预算。

### Resulting Impacts

- manifest 明确 fast 资格与 change region，清除旧 required 选择模型；保留依赖传播、观察闭合和 Product strict-all 聚合。
- 复用已有 package 输入清单保守选择验收，不另造更窄但不完整的发布清单。
- 策略预检与同次 contributor 保留异常 fail-closed、阶段 timing、全部 duration facts、candidate 身份、实际预算和定位入口。
- 导航把交付入口改为 changed；发布/大范围变更仍 all。Case 身份按连续证明保留，旧决策经正式演进退出当前依据。

## Risks / Trade-offs

当前工作区广泛改动可能使 changed 接近 all，快检与旧默认比较只能说明新反馈档位差异。环境波动仍可阻断；不重跑取绿。fast 成功不保证行为验收完成，必须在启动摘要和使用路径明确这一边界。

## Open Questions

暂无需用户裁决的问题。实现中的 exact metadata 与诊断字段以稳定代码为准，审查后同步 owner。
