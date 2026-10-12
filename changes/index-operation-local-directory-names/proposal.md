# Proposal

在一次文件收集中按名字索引已观察目录条目，减少宽目录精确路径查找的重复扫描。

## Why

[复杂度调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)的候选：K01 在真实 collectProjectFiles 的 N 个同目录精确路径上产生 N² 名称比较；已有目录读取缓存没有索引成员名字。

## Outcome

公共文件收集保持完全相同的 selected paths、字节身份、安全与错误语义，目标查找不再反复全扫目录。

## Scope

### Intended Change

只改 CollectionDirectoryAccess 的 operation-local 目录表示：保留原 entries 数组，并按原顺序构造 `name → entry 列表`。targetEntry 使用 bucket，不换 walker、不改变剪枝或 matcher。

### Resulting Impacts

同 decoded spelling 可能对应有损 UTF-8 与真正 U+FFFD，必须保留全部候选和原次序；必要 I/O、no-follow、lazy lstat 和单次目录读取证据持续成立。新增索引 O(条目数) 内存随操作结束释放。

## Success Criteria

1. 第二批 before 在已优化的第一批 Run 上冻结；同 harness/fixture/runtime 的 after 与独立计数说明收益或噪声，不混入第一批收益。
2. 目标行为测试、独立正确性/文档影响审查、Case 完整性与最终完整 Gate 通过；公开语义不扩张。
3. 形成时证据交接 Investigation `261012-verify-priority-complexity-optimizations`；无未授权 Git 写入或 Change 删除。

## Affected Owners

[Project files](../../docs/development/project-files.md)、[收集指南](../../docs/guides/collecting-project-files.md)、相邻 collection/path-identity tests 与 scan-scope Cases。
