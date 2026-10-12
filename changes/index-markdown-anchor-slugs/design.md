# Design

在单次 Markdown Link resolver 内按不可变文档 facts 复用 heading slug membership。

## Context

用户已授权优先复杂度优化；本 Change 拥有独立 Check-local Outcome，第一批 Run 优化只作为测量基线，不与其收益混算。来源见[调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)，当前稳定语义由 proposal 所列 owner 拥有。

## Goals / Non-Goals

相同 Markdown 输入保留完整 occurrence、Findings、顺序与授权行为，重复 anchor membership 变为一次索引后查找。

不引入新 API、limits、waiver、外部依赖或跨调用缓存，不扩大到其它复杂度候选。

## Decisions

### Intended Change

same-document 与已读取 cross-document facts 走同一个 invocation-local lazy slug membership。
重复 slug 的既有生成规则由 parser 拥有；Set 只索引已生成结果。

写入范围：src/package-checks/markdown-link-validation/resolver-engine.ts、local-resolution.ts、必要相邻测试和 docs/development/markdown-link-resolution.md。

### Resulting Impacts

不改 parser/GitHubSlugger、持久 cache payload 或公开 API。每次 direct-target live authorization、target budget、当前 bytes 校验继续执行；索引与 resolver 同生命周期。

沿用 AUX-MARKDOWN-LINK-TARGET-001 的既有实体；增强 duplicate/Unicode/encoded/missing/flags/live authorization/new-resolver freshness 证据，不机械新增 Case。

测量协议：公共 markdownLinkValidation→defineConfig/run，H=Q=16/4096，单 source 的全部 link 指向最后一个合法 slug，cache disabled、全部 Run outputs disabled。检查 passed、Q occurrences、零 Findings/Records、零 target reads；失败/cross-document 由行为测试证明。
全部使用锁定 Bun 1.3.14，3 warmups/9 samples，记录完整样本、median/MAD/range、源码与 fixture 身份；timing 只作 observation，不新增 CI SLA。单 run 10 秒、整轮 5 分钟有界停止；pilot 调整在正式 before 前冻结。

## Risks / Trade-offs

不能把事实复用误用为 target 授权缓存；空/编码/Unicode fragment 与 flags 短路需保留。小文档建 Set 的固定成本须独立观察。

## Open Questions

无设计或验收阻断问题。已完成的操作计数、完整路径 timing 与噪声边界见下节；后续扩展负载或优化范围须重新取证。

## Implementation Observations

最终同窗 H=Q=4096 的 median 从 800.629 降至 636.501 ms（约 20.50%），slug 比较 16777216→0，
由一次 Set 构造与 4096 次 has 接替；小输入不能保证逐点提速。

初轮 Gate 暴露 local resolver 测试文件行数超限，已将一个 endpoints 实体及原 helper 按职责分离，
断言完整保留；Case 只移动对应 Entity 路径。非实施代理复核与第二轮 43/43 Gate 通过。
初轮原始样本保真保留，最终采用来源及未覆盖形状见
[实施调查](../../docs/investigations/verify-priority-complexity-optimizations.md)。
