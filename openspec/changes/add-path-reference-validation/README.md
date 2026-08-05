# add-path-reference-validation

为文本中的文件系统路径引用提供可配置的策略检查。

## 当前状态

这是临时且未审计的 OpenSpec change。`tasks.md` 的 1.1 是唯一实现入口；完成前不得实施或视为已批准。

## 阅读顺序

1. `tasks.md` 1.1；2. `proposal.md`；3. `design.md` 的 numbered decisions；4. `specs/**/spec.md`。

## 直接依赖

- `standardize-quality-capability-contract`
- `add-file-policy-overrides`
- `add-markdown-link-validation` 的 destination ownership 契约；不依赖该 capability 在运行时启用。
