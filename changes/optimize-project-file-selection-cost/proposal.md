# Proposal

在单次文件收集内复用已证明等价的路径谓词，消除安全字面列表的重复编译成本。

## Why

相同最终路径使用大量显式 patterns 时，单路径 policy 判断反复编译完整列表，占本样本 instrumented 总时长约 94%。根因、候选转折及最终公开调用对照见[调查报告](../../docs/investigations/evaluate-project-file-selection-optimization.md)。

## Outcome

保留公开 API、原生列表语义、默认排除、必要失败、no-follow、byte identity 和冻结稳定结果，降低安全字面路径列表的公开收集成本。性能结论限定于实测 workload。

## Scope

### Intended Change

在 `filesystem-collection.ts` 为安全 ASCII 字面列表建立操作内 `Set`；其它用户列表继续原生匹配。固定正向默认排除谓词在本操作首次实际需要时编译并复用。最终完整选择仍由 `collection.ts` 拥有，文件系统获取和 inspection 顺序保持。

### Resulting Impacts

- 在既有 `collection.test.ts` 实体中补充 literal/duplicate/dot、原生 fallback 和超长错误上下文断言，保持 `COLLECTION-NATIVE-PATTERNS-001` 的证明目的。
- 在 `docs/development/project-files.md` 说明操作内谓词机制；公开指南不变。
- 用物化的 853 文件 fixture 固定 A/B 输入，隔离工作区源码与文档增长；临时 fixture 放在自有 `node_modules/frozen-fixture`，避免测试发现污染。
- 三份报告增长使当次 Gate Markdown Link 超过 1500 容量；按公开 Check 的 1702 次 logical target 验证证据，仅将 Gate-owned 容量改为 2000，同步配置、测试、owner 和既有 Case 数字。

## Success Criteria

1. Node 主基线与 Bun 参考在同 fixture、patterns、采样和计时边界上比较公开调用，完整排序路径及 frozen 相等；明确实测收益与未覆盖范围。
2. 现有必要 IO、symlink、特殊/byte 路径、默认排除/重包含/负列表、混合 selections 与空列表测试通过。
3. 工程、材料、Case、required/complete Gate 及安装包验收覆盖受影响边界；独立审查确认契约与测试目的连续。
4. 正式报告保留候选拒绝、输入身份、原始样本和验证边界；本地验收与远端发布分开表述。

## Affected Owners

- 公开行为：`docs/guides/collecting-project-files.md`。
- 内部机制：`docs/development/project-files.md`。
- 测试与 Case：测试策略、Case 维护、`docs/testing/cases/scan-scope.md`。
- 按需边界：`docs/decisions/retain-on-demand-project-file-collection.md`。
- 交付容量：`docs/tooling/project-gate.md`、`docs/testing/cases/repository-tooling.md` 的 `AUX-PROJECT-GATE-CATALOG-001`。
