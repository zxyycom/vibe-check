## REMOVED Requirements

### Requirement: Checked-in project fixture suite
**Reason**: 该 requirement 绑定 Rust CLI 的四语言 checked-in project suite；该 suite 随 Rust 产品删除，且现有 TypeScript tests / fixtures 是本 change 的唯一测试来源。

**Migration**: 无。现有 TypeScript assets 按 pinned source 原样上移，不补建 replacement suite。

### Requirement: Fixture coverage boundaries
**Reason**: 该 requirement 要求 Rust CLI project fixtures 覆盖 ignore、默认排除、多语言和 unsupported file matrix，不属于 TypeScript source lift-and-shift 范围。

**Migration**: 无。发现的 coverage 缺口进入后续 change。

### Requirement: Fixture proof targets
**Reason**: 该 requirement 绑定 Rust CLI JSON/schema fixture proof targets；Rust renderer 与 schema 不迁入 TypeScript 产品。

**Migration**: 无。现有 TypeScript tests 继续证明其 pinned behavior。

### Requirement: Warning threshold fixture support
**Reason**: 该 requirement 固定 Rust `file.too_many_lines` threshold fixture 和 blocking gate behavior，不属于现有 TypeScript warning rules。

**Migration**: 无。不得从 Rust fixture 构造 TypeScript replacement。

### Requirement: Fixture maintenance documentation
**Reason**: 该 requirement 只维护即将删除的 Rust checked-in project fixture suite。

**Migration**: 无。迁移后的 TypeScript test 路径在源码实际移动后按任务 5.6 更新。

### Requirement: Duplicate code fixture coverage
**Reason**: 该 requirement 绑定即将删除的 Rust CLI duplicate scanner，不属于 TypeScript/Bun 源码上移范围。

**Migration**: 无。Rust fixtures 随 Rust 产品删除；现有 TypeScript duplicate tests 与 fixtures 按固定来源原样上移。

### Requirement: Structural scanner characterization fixtures
**Reason**: 该 requirement 绑定即将删除的 ast-grep Rust dependency characterization，不属于 TypeScript/Bun 源码上移范围。

**Migration**: 无。Rust fixtures 随 Rust 产品删除；现有 TypeScript Python/Lizard adapter tests 与 fixtures 按固定来源原样上移。

### Requirement: Function warning project fixtures
**Reason**: 该 requirement 固定 Rust CLI `function.too_many_parameters`、human/JSON 和 gate fixture behavior，不属于 pinned TypeScript warning contract。

**Migration**: 无。现有 TypeScript warning generator tests 按固定来源原样上移。

### Requirement: Structural fixture ownership remains traceable
**Reason**: 该 requirement 维护 ast-grep characterization 与 Rust structural fixture ledger，相关资产随 Rust 产品删除。

**Migration**: 无。实际迁移的 TypeScript test paths 在任务 5.6 中更新，不建立 Rust-to-TypeScript case 映射。
