# Proposal

升级 Execa 并使 commandCheck 只把完整进程结果交给调用方完成阶段。这是本次已授权实施的临时计划。

## Why

当前 Execa 9.6.1 超限后可能等待执行超时；归一化选择非零退出时会丢掉超限事实，使截断输出进入 afterCommand。

## Outcome

Execa 10.2.0 下运行中超限触发回收，任何不完整结果都跳过 afterCommand，正常完整非零退出仍可由调用方结算。

## Scope

### Intended Change

升级 Execa 至 10.2.0，并在 Product 私有进程结果中独立保留完整性事实；默认原因优先级和现有 exclusive flags 保持，沿用底层文本捕获限额。

### Resulting Impacts

根依赖、lockfile 与发布 manifest 由统一依赖 owner 写入；process/result、command completion、真实回收及 installed consumer 证据同步。outputByteLimit 名称兼容保留，公开说明如实表达近似文本限额；不引入精确 UTF-8 捕获、watcher、kill wrapper 或新增公开 API。
Execa 10 的同步 options 分支由私有文本包装适配；上游 all 结果声明的 exact-optional 缺陷以版本精确的 pnpm 声明补丁修复，保留 TS6/TS7 正负类型证据，不改变运行时代码或关闭库类型检查。

## Success Criteria

- 目标版本及实际安装、发布清单一致，最窄行为证据和最终完整 Gate 均通过。
- 实际差异、稳定 owner、Case 与必要交接同步；按本轮授权保存 Git 完成态、运行提交 hook 并正常结项，正式发布另行授权。

## Affected Owners

docs/guides/command-check.md；src/package-checks/host-environment/process/**；src/package-checks/command-check/**；相关 Case 与 installed command fixture。
