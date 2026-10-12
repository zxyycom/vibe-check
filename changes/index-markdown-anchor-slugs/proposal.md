# Proposal

在单次 Markdown Link resolver 内按不可变文档 facts 复用 heading slug membership。

## Why

[复杂度调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)的候选：K05 对同一文档 H 个 headings 的 Q 次 anchor 查询反复线扫，存在 QH 额外比较；合法 same-document 输入即可触发。

## Outcome

相同 Markdown 输入保留完整 occurrence、Findings、顺序与授权行为，重复 anchor membership 变为一次索引后查找。

## Scope

### Intended Change

`LinkLocalResolver` 增加 invocation-local `WeakMap<immutable facts, ReadonlySet<slug>>`，仅需要 anchor 时懒建；private `anchorResolution` 消费 membership。

### Resulting Impacts

不改 parser/GitHubSlugger、持久 cache payload 或公开 API。每次 direct-target live authorization、target budget、当前 bytes 校验继续执行；索引与 resolver 同生命周期。

## Success Criteria

1. 第二批 before 在已优化的第一批 Run 上冻结；同 harness/fixture/runtime 的 after 与独立计数说明收益或噪声，不混入第一批收益。
2. 目标行为测试、独立正确性/文档影响审查、Case 完整性与最终完整 Gate 通过；公开语义不扩张。
3. 形成时证据交接 Investigation `261012-verify-priority-complexity-optimizations`；无未授权 Git 写入或 Change 删除。

## Affected Owners

[Markdown Link owner](../../docs/development/markdown-link-resolution.md)、[Check 指南](../../docs/checks/markdown-link-validation.md)、相邻 resolver tests 与 scan-scope Cases。
