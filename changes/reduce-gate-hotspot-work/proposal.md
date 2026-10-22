# Proposal

拆分三个已测 Gate 热点，减少有证据的重复工作和无效等待，并保持完整验收。

## Why

上一轮完整 Gate 的 function-metrics、Product Markdown test lane、隔离 consumer preparation 分别约 5.92、5.74、5.55 秒。总时长含并发争用，不能直接归因于分析器、解析器或安装。

## Outcome

给出三个热点的阶段成本，对可安全消除的工作实施最小优化，用同一负载多样本比较 before/after；完整验收和失败边界不降级。

## Scope

### Intended Change

先冻结负载和基线，再审查 function-metrics 的输入/Worker/分析/结算、Markdown 测试的慢项及 fixture/解析、consumer 的 fixture/安装/声明依赖/入口解析。只采用有收益与等价证据的重复工作或无效等待削减。

### Resulting Impacts

按实际修改同步 owner 与 Case，必要时独立审查文档影响。保持检查范围、资源/取消/安全边界、完整 lanes 和 package acceptance；不调高并发或预算，不改来源对齐 analyzer core/readers/protocol，不创建远端写入或发布。

## Success Criteria

- 每个热点都有可复现 workload、阶段观察和多样本 before/after，说明争用与外推限制。
- 优化保持当前可观察结果、全部重要断言与完整 Test Evidence。
- 最窄测试、工程验证与正式 complete Gate 通过；残留热点和未采用方案明确。

## Affected Owners

Project Gate、function-metrics、Markdown Link、Package lifecycle、测试策略和 Case 维护。
