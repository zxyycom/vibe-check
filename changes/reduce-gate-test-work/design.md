# Design

优先减少重复操作，再只在已审计的 test-body 输入边界缩小 required 选择。

## Context

形成时基线为 main / HEAD `34c58409`，完整账本为 766 entities / 190 Cases；前序测试优化与独立 Markdown 调查保留。选择规则由 [Project Gate](../../docs/tooling/project-gate.md) 拥有，测试闭合由 [Case 维护](../../docs/testing/case-maintenance.md) 拥有。

## Goals / Non-Goals

目标是减少包测试成本和测试正文的过宽选择，保持 Product runtime、cache policy、Gate budget、scheduler、Check 数量与完整验收强度。后续授权包含文档/代码审阅与 Git 提交，Change 目录保留。

## Decisions

### Intended Change

相邻未变化的指纹保存为局部值；将编译器 manifest 矩阵在一个隔离子进程执行并逐项断言。required 仅排除已确认无跨组 import 的测试正文，显式保留拥有者。未知输入和 helper 仍宽选，function-metrics 全树扫描例外保持。

### Resulting Impacts

路径矩阵覆盖自身 lane、非自身 lane、删除/rename 形状和跨 owner 输入。当前 Case 的证明边界与 owner 一并同步，并做独立文档影响审查。测量通过 exact candidate 的 public API 执行现有 Gate Checks，冻结 changed-path 场景；不声称覆盖 candidate preparation、adapter 或 Git acquisition 的端到端收益。正式 Gate 仍只从 bun run check 运行。

## Risks / Trade-offs

非 import 文件读取不能仅凭 import 图排除，故保留 source-identity 组。并行调查造成 timing 噪声，采用多样本并报告环境；代码操作数下降可以独立于噪声证明。新增实现文件会改变真实 required workload，因此受控场景单独测量。

## Open Questions

无需要用户决定的开放问题；是否采用每一项缩窄，以输入审计和测试闭合为准。

## Implementation Observations

已采用的操作、前后测量、验收和留存边界见 [实施与测量证据](evidence.md)。原始 JSON 保存形成时观察，稳定行为由相应 owner 文档与源码承接。

2026-10-22 的跨组文档/代码交付复核及完整 Gate 结果见 [交付复核](../reduce-gate-preparation-cost/evidence.md#交付复核2026-10-22)。
