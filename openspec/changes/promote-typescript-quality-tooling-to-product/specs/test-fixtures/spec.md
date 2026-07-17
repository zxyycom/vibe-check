## REMOVED Requirements

### Requirement: Duplicate code fixture coverage
**Reason**: 该 requirement 绑定即将删除的 Rust CLI duplicate scanner，不属于 TypeScript/Bun 源码上移范围。

**Migration**: 无。Rust fixtures 随 Rust 产品删除；现有 TypeScript duplicate tests 与 fixtures 按固定来源原样上移。

### Requirement: Structural scanner characterization fixtures
**Reason**: 该 requirement 绑定即将删除的 ast-grep Rust dependency characterization，不属于 TypeScript/Bun 源码上移范围。

**Migration**: 无。Rust fixtures 随 Rust 产品删除；现有 TypeScript Python/Lizard adapter tests 与 fixtures 按固定来源原样上移。
