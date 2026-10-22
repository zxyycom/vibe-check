# Tasks

子代理承担全仓逐项普查，主代理闭合全部覆盖、交叉复核并保存可交接结论。

## Readiness

- [x] 0.1 核对全树 Case 闭合、工作区已有改动、owner 分工与审查标准。
- [x] 0.2 按用户澄清恢复完整 766 实体清单，将剩余 628 实体划分为八个互斥完整分区；补充核对非日常入口和委托验收。

## Implementation

- [x] 1.1 完成 Gate 测试质量审计与有证据的候选，见 gate-review.md。
- [x] 1.2 完成 package 测试质量审计与有证据的候选，见 package-review.md。
- [x] 1.3 完成 Markdown link 测试质量审计与有证据的候选，见 markdown-link-review.md。
- [x] 1.4 完成剩余 repository tooling 79 实体及明确补充入口的普查，见 repository-review.md；精确 keys 零遗漏闭合。
- [x] 1.5 完成 package tools / function-metrics 前门 / Markdown lint 84 实体普查，见 package-tools-review.md；精确 keys 零遗漏闭合。
- [x] 1.6 完成 function analyzers 82 实体普查，见 analyzers-review.md；精确 keys 零遗漏闭合。
- [x] 1.7 完成 Run outputs / progress / diagnostics 63 实体普查，见 run-outputs-review.md；精确 keys 零遗漏闭合。
- [x] 1.8 完成 scheduler / admission provider 73 实体普查，见 scheduler-review.md；精确 keys 零遗漏闭合。
- [x] 1.9 完成其余 Run / Definition 94 实体普查，见 run-definition-review.md；精确 keys 零遗漏闭合。
- [x] 1.10 完成 data / JSON / command / settlement / machine 76 实体普查，见 data-json-command-review.md；精确 keys 零遗漏闭合。
- [x] 1.11 完成其余 scanners / scope 77 实体普查，见 scanners-scope-review.md；精确 keys 零遗漏闭合。

## Verification

- [x] 2.1 主代理复核各组候选和跨层重复，summary.md 已形成全仓结论，区分缺陷、增强和待证项。
- [x] 2.2 最新官方清单与全部审读并集闭合为零遗漏，282 源码哈希匹配、已有改动保持；独立审查通过，材料/Case/Change 校验通过，见 coverage.md。
