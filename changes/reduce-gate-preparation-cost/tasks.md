# Tasks

先固定基线，再实施与回归，最后复测及完整 Gate。

## Readiness

- [x] 0.1 读取 owner/Case 并完成完整 Test Evidence 起点，建立 frozen fixture 与正式 before 测量。

## Implementation

- [x] 1.1 抽取完整输入清单并独立复制，保留顺序/工具链/敏感性，验证新输入、排除非输入和副本隔离。
- [x] 1.2 Validation layout 按需加载，证明默认调用与所有短路/失败行为；同步 owner 和原 Case。

## Verification

- [x] 2.1 正式 after 复测，目标测试/完整 Test Evidence/typecheck/lint/validate 与独立文档影响审查通过。
- [x] 2.2 required 和 --all 完整 Gate 通过，核对局部 diff、Project 未改与交付证据。
