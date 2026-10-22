# Tasks

按删除、改写、独立审查与完整 Gate 的顺序闭合 56 个已授权问题目标。

## Readiness

- [x] 0.1 核对 main、既有改动、规则、56 目标分工与起点全树 766/190 闭合。
- [x] 0.2 三个实现分区明确互斥源码所有权、阶段边界、Case 串行归属和预算保护。

## Implementation

- [x] 1.1 repository/package/Markdown 第一阶段无价值断言删除及 Gate 条件合并；最窄 29+1 tests 通过，独占 metadata 已迁移。
- [x] 1.2 Run/Definition/scheduler/output 第一阶段局部冗余删除；最窄 14 tests 通过。
- [x] 1.3 tools/analyzer/data/scanners 第一阶段冗余删除；含承接证明的最窄 11 tests 通过。
- [x] 1.4 第一阶段局部 diff 与承接证明复核完成；Case 删除 donor/更新 native 名称后全树 765 实体 / 190 Cases 闭合，通过后开放改写阶段。
- [x] 1.5 repository/package/Markdown 17 目标及两示例；最窄/类型/投影通过，export observer 按真实职责拆分后，source/artifact 测试与质量预检通过。
- [x] 1.6 Run/Definition/scheduler/output 19 目标；59 tests 与 15 组反证通过，复用 execution fixture、归属并发生命周期后，最窄 9 tests、SCH003 反证与质量预检通过。
- [x] 1.7 tools/analyzer/data/scanners 20 目标；75 tests 与 10 反例通过，共享 child 生命周期与固定 assessment oracle 后，最窄 27 tests 与质量预检通过。
- [x] 1.8 独立核对 56 目标、删除承接与保留价值；正式查询确认只有 donor 删除及三处 rename，190 Case IDs 连续，765 实体全树闭合。

## Verification

- [x] 2.1 各组最窄/类型/lint 及修复后复验通过；统一 validate、765/190 全树闭合、format、24 项 Change 检查和新材料本地链接复验通过。
- [x] 2.2 独立代理按编码规范、实际使用价值及 ai-ready-docs 完成源码/文档与修后复核；无剩余整改项，完整 Gate 的预算失败如实保留。
- [x] 2.3 完整 Gate 已运行并保存现场：修正后 43/43 Checks 通过，平均时长 2034.7 ms > 2000 ms 仍使最终 exit 1；不在同一源码自动重试，不放宽预算，剩余边界见 results。
- [x] 2.4 最终范围、共享增量 diff、8 个既有文件/预算哈希、原删除、main/HEAD/空暂存区核对通过；材料与本地链接复验通过，结果独立可读，版本保存与退出按各自授权办理。
