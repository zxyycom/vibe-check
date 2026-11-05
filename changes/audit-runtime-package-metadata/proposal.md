# Proposal

本计划按实际消费者审计运行时包读取，修复 markdownlint 缓存和候选安装探针的模块解析不兼容。

## Why

markdownlint `0.42.0` 未导出 `package.json`。旧缓存实现读取该路径，在所测 Node 中失败并静默跳过缓存，
而 Bun 的解析行为让既有测试继续通过。候选安装探针也使用该路径，需要同时核对其他读取的真实责任。

## Outcome

Node 消费者显式启用缓存后可取得 `computed` → `cache` 并实际落盘；候选探针可靠定位 markdownlint，
同时保持安装身份、路径隔离与工具链指纹保证。

## Scope

### Intended Change

审计产品与仓库工具的动态加载、包元信息及目录定位。缓存版本改用公开 API；候选 markdownlint manifest
从实际解析的公开入口定位；其余读取按消费者与字段用途决定保留或替换。

### Resulting Impacts

保留版本、bin、路径 containment、类型闭包与工具链指纹；同步稳定 owner、适用测试和 Case 映射，
以真实 Node child 与 candidate 安装证据核对跨运行时边界。

## Success Criteria

1. 各类读取均能恢复消费者、实际字段和保留或替换理由。
2. 缓存回归在旧实现下失败，修复后证明 Node cold/warm、findings 一致与落盘；明确 Bun runner 和 Node 原生证据的区别。
3. 候选探针在 Node/Bun fixture 中验证最近 manifest 边界及错误诊断，真实安装继续通过既有身份、containment 和 bin 验收。
4. 稳定 owner、调查与本计划各自承接当前规则、形成时认识和实施交接，复核与检查有可追溯结果。

## Affected Owners

- [Scanner dependencies](../../docs/development/scanner-dependencies.md)：缓存版本来源与失败路径。
- [Package lifecycle](../../docs/tooling/package-lifecycle.md)：候选安装探针与身份验收。
- [Workspace dependencies](../../docs/tooling/workspace-dependencies.md)：工具链和动态导入审计依据；既有责任保持不变。
- [测试策略](../../docs/testing/strategy.md)与 [Package tooling Case](../../docs/testing/cases/package-tooling.md)：回归与证据映射。
