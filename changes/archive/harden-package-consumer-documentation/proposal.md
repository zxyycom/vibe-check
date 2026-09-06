# Proposal

本 Change 计划修正已审计确认的 package consumer 文档与 JSDoc 易用性问题。

## Why

当前随包材料能够支持主要使用路径，但内置 Check 的最小示例没有一致地执行并判断 Run 结果，部分安全关键字段只在长篇指南中解释，且两处包内说明引用了未随包交付的仓库路径。这些缺口会让复制示例的 CI 错误绿灯，或迫使用户离开当前声明和 package 才能理解契约。

## Outcome

随包用户可以从每项内置 Check 的最小示例完成实际运行并明确处理失败，从 IDE hover 理解关键 Run/output 与 JSON Schema 配置边界，并且所有面向 package consumer 的引用都在已交付材料内闭合。

## Scope

### Intended Change

统一内置 Check 最小示例的执行与结果处理；补充 RunResult、RunControls/aggregation、caller cache、公开 final data、直接供自定义调度消费的 DTO、output status 和 JSON Schema 安全关键 supporting declaration 的中文 JSDoc；替换未随包交付的仓库内部引用。

### Resulting Impacts

可执行示例投影源、手写 package Markdown、declaration source JSDoc、生成 candidate 与 installed-consumer 文档验收需要保持同步。该调整不新增 root export、不公开 repository Gate、scanner/Worker、调度 provider 或其它私有机制，也不改变 Product runtime 行为。

## Success Criteria

- 八项内置 Check 的最小用法都会实际调用 `run`，并明确展示或紧邻说明如何把业务失败映射为调用方进程失败。
- RunResult/RunControls、aggregation、caller cache、公开 final data、调度 callback DTO、output status 与 JSON Schema 安全关键子契约可从局部 declaration JSDoc 理解主要分支、字段关系、特殊值和信任边界。
- 随包 Markdown 不再要求用户访问未交付的 `docs/examples` 或 `changes/**` 路径。
- 受影响的文档投影、类型检查、package material/candidate 验收通过，且没有扩大 public API surface。

## Affected Owners

- `docs/checks/**`、`docs/guides/**` 与 `docs/examples/package-api/**`
- `src/project-run/result.ts`、`src/project-run/outputs/status.ts`
- `src/project-run/controls/contract.ts`、`src/cache/cache-json-by-key.ts`
- `src/project-definition/scheduler-policy.ts` 与 package Check final-data owners
- `src/package-checks/json-schema-validation/options.ts`
- `scripts/docs/**`、package material 生成 owner及其最窄验收
