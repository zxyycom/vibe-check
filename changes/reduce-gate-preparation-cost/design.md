# Design

只共享 artifact 仓库输入清单，在边缘分别执行 hash 和独立复制；layout 留在现有默认 validation 分支。

## Context

本轮为 fixture 复制与 Validation 加载建立独立 before/after；前序优化同时存在于两阶段。较早的加载原型保存于 `.log/gate-loading-audit/20261022-v4u4iO`，仅作调查背景。工作区位于 main，其它会话的 Investigation 独立保留。

## Goals / Non-Goals

仅复制当次完整输入，按需加载 Validation layout，保留独立副本与完整验收。Project、测试分区、runner、跨 Run 缓存与预算保持原样；后续授权包含文档/代码审阅与 Git 提交，Change 目录保留。

## Decisions

### Intended Change

生产 artifact 模块每次发现并排序当前仓库输入；hash 按原顺序（含重复项）读取，fixture 对路径去重后复制普通独立文件。工具链由原 resolver 拥有。layout 在材料成功且非 materials-only 时动态 import 并运行，随后执行原 Git 检查。

### Resulting Impacts

完整输入的共同契约仅在 artifact owner，hash/复制操作与生命期各自保留。测试保留原 Case/实体目的，新增输入与复制隔离使用临时 sibling fixture；layout 用一次隔离 child 读取真实 adapter 副本和窄依赖 stub 证明未加载/默认调用/失败传播，另运行真实完整 validate。输入冻结 baseline 与实际 lane 测量分开，after 新增的回归步骤明确记录。

## Risks / Trade-offs

抽取不得改变字节顺序或缓存输入发现。正式 fixture 和当次 fingerprint 相等不能替代独立敏感性断言。动态 import 失败不可转成功。非冻结工作区/其它会话负载可能引起噪声，使用 frozen source 与多次中位数/区间。

## Open Questions

无。形成时的外部 JSON 阻塞及原会话处理后的复跑结果见 [实施证据](evidence.md)。

## Implementation Observations

正式前后测量、hash parity、隔离负向控制与完整 Gate 验收见 [实施证据](evidence.md)。其中分别保存首轮冷态警报、外部材料失败和暖态复跑；局部计时与 Gate 墙钟按各自 workload 解释。
