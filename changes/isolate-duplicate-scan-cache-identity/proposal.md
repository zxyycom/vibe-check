# Proposal

将 Duplicate 扫描输入与缓存身份分开，让不使用缓存的扫描不承担内容 fingerprint 和 Git identity 成本。

## Why

实施前 exact input 同时携带批准路径、area 与 cache directory/commit/fingerprint；关闭缓存或没有足够输入时仍先形成全部身份。
扫描合法性依赖了缓存专用字段，使可选缓存成本进入非缓存路径。

## Outcome

扫描始终履行 exact-input 与 scanner 验收义务，只有实际缓存路径形成完整缓存身份；结果和 cache-on 行为保持。

## Scope

### Intended Change

- 拆开 Duplicate 私有 scan input 与 cache identity 准备，内容 fingerprint/Git/cache directory 留给 cache owner。
- 在 cache off、无有效扫描工作或 dependency unavailable 时不执行用不到的身份获取。
- 保留 scanner availability/version、批准路径、fragment acceptance、area policy 与 Finding settlement。

### Resulting Impacts

- 改变 Duplicate execution、measurement model/validation 与 cache 接线，更新相邻测试和内部说明。
- 保持 cache-on 完整身份、失效、读写失败与 fragment 验收；不更换 cache 格式或放宽 payload。
- 公开 options、Check facts、Records 与默认 cache-enabled 行为不变；Case 按实际证明维护。

## Success Criteria

- 确认 cache-off/no-work/unavailable 不再获取 cache-only 内容身份，scanner 所需读取和版本检查仍执行。
- cache-on 对路径、内容、commit、scanner/version/阈值变化的失效行为与当前结果保持一致。
- 目标行为、类型、lint、Case 和组合 Gate 通过；新性能对照区分 cache-off/on 与实际 scanner 成本。

## Affected Owners

- [Duplicate Detection](../../docs/checks/duplicate-detection.md)
- [Project files](../../docs/development/project-files.md)
- [Scanner dependencies](../../docs/development/scanner-dependencies.md)
- [测试策略](../../docs/testing/strategy.md)
