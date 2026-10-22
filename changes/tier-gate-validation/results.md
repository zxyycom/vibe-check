# Gate 分层与版本化性能策略结果

三档选择与统一策略已生效，原有 43 项验收保留。**三档实测选中的 Checks 全部通过，但最终都因性能预算失败，exit 1；本次没有最终绿色。**

## 已实施

- 默认 fast 有 9 项工程检查/快速测试资格，按输入选择；changed 覆盖全部受影响验收，包含相关 artifact/consumer；all 保留完整 43 项兜底。
- 预算由仓库 `runtime/performance-policy.ts` 统一拥有：fast/changed 总时长 30000 ms、all 90000 ms，三档均值 2000 ms、P95 5000 ms。严格超标失败，runtime 只作诊断。
- manifest 改为 fast 资格与 change region，保留 receipt、focused、exact candidate、依赖传播和严格聚合。未知根路径或不可用 Git 证据下 changed 选择全部；已知目录家族的新模块由保守 owner region 承接。

当前精确规则见 [Project Gate](../../docs/tooling/project-gate.md#selection-presets-and-scheduling)，局部改动的最低验证见[导航](../../docs/navigation.md#交付验证)。两项长期判断分别记录分层与统一预算；旧硬阻断记录正式归档，原 Change 只维护归档后链接。

## 实际运行

2026-10-22，Linux x64、Bun 1.3.14；所有调用使用同一 exact installed candidate `0.0.0-local.cb8d0137e8f7`，准备动作为 reuse。每档独占顺序运行一次，无其它本任务测试/编译并发。

| 调用 | Checks passed / not-applicable | 启动至初步结果 | 均值 | P95 | 最终状态 |
| --- | ---: | ---: | ---: | ---: | --- |
| 修改前默认 required | 32 / 11 | 32105.7 ms | 2338.3 ms | 5300.7 ms | 三项超标，exit 1 |
| 修改后默认 fast | 8 / 35 | 6739.1 ms | 2020.4 ms | 5566.8 ms | 均值/P95 超标，exit 1 |
| 修改后 changed | 38 / 5 | 54799.5 ms | 3565.3 ms | 9718.6 ms | 三项超标，exit 1 |
| 修改后 all | 43 / 0 | 51564.3 ms | 2740.3 ms | 8735.6 ms | 均值/P95 超标，exit 1 |

各次均为 0 failed Checks / 0 unavailable；最终失败来自性能 contributor，不改写 Product aggregate。这里的总时间来自原始阶段 timing，不是 progress summary 的 Run elapsed。fast 当前未命中 package-tools boundary，故实际 8 项而非资格上限 9 项。

默认反馈从本次 32.1 秒变为 6.7 秒，原因是明确减少日常反馈工作量；两次样本与选择集合不同，不能解释为同工作量提速，也不能证明完整验收性能改善。changed 本次同时涉及 package、Gate 与大量先前未提交测试清理，因此接近 all；完整策略与输入闭合仍由 all 独立验证。

## 验证与修正

- selection/adapter/Definition/factory 最窄 37 pass、quality 4 pass、observer 4 pass；后续修正复验为 18 与 19 pass。这些复验有重叠，不累计为新增覆盖。
- scripts typecheck/lint、format（997 文件）、材料（607 Markdown）、Decision 与 25 Change 检查通过；Test Evidence 从 765 降为 **764 实体 / 190 Cases**，仅删除旧 loader 实体并作 6 处语义连续 rename。
- 独立审查促成未知 project/validation 子 owner 漏选修复。首次质量预检 3 passed / 2 failed，修复 entry 职责与归档链接后为 **5/5 passed**，未改门限或增加 waiver。
- 策略 loader 以 unknown 输入经预检收窄，修复负例 fixture 的 unsafe assertion；quality 测试消除 JSON 值的非契约 prototype 差异，独立 expected 和 Finding/outcome 证明保留。全部早期失败日志保留。

## 现场与剩余边界

全部本地日志位于 ignored `.log/gate-tiers-20261022-0YCcXK/`；`gate-results.json` 汇合同次原始 context，三个 `check-<profile>.exit` 均为 1。

| 档位 | 完整 Gate 现场目录（`.log/project-gate/` 下） |
| --- | --- |
| fast | `2026-10-22T10-08-43.710Z-3545721-c0876f4c-c2c7-4597-ae5d-d9b0571fccc1` |
| changed | `2026-10-22T10-08-50.556Z-3546051-59ff1303-bc63-4828-a5ca-4f0d3fc2c7e7` |
| all | `2026-10-22T10-09-47.313Z-3549324-33eea48d-3a5e-45a5-895d-a110413e4a2f` |

各目录的 `gate.log` 保存唯一最终 result/exit、原始预算/统计、candidate 身份与全部 Check duration facts；`machine/run.json` 保存 Product Checks。预算策略生效与实际性能达标是两个事实，长期判断的 aligned 只表示本轮规则已落地并验证，不表示三个档位已达标。

交接复验通过：764/190 全树闭合、材料、375 Decision、25 Change 与新材料 6 处本地链接。起点捕获的 102 个既有文件中，89 个逐字未变，13 个属于明确目标及归档链接维护；旧前序除 lifecycle/path 外的内容可还原起点哈希。当时的 ignored 预算文件、main/HEAD 与空暂存区保护核对通过；从该次完整 Gate 到本记录形成期间未修改 src/scripts。

剩余问题是实际性能尚未满足既定门限。没有以重试求绿、放宽阈值、拆合 Check 或将成本转移到 preparation 处理它；后续优化需独立确定范围。本轮验收记录形成时，工作留在 main，未执行 stage/commit、Change finalize/delete 或远端写入；后续版本保存另按当前授权办理。
