# Tasks

先建立新版可读中间态，再迁移标准身份并删除历史集合，最后以治理检查和完整 Gate 闭合交付。

## Readiness

- [x] 0.1 运行 Change / Decision discovery，读取新旧固定契约和相关项目 owner，确认当前版本、集合规模与适配边界。
- [x] 0.2 精确盘点 `changes/archive/`、历史 OpenSpec `archive/` 及当前树中的直接引用，并确认用户删除授权。
- [x] 0.3 从全部 `createdAt` / `formedAt` 生成 legacy→dated ID 映射，验证日期、name、目标 ID、source locator 与资源 owner 无冲突。

## Implementation

- [x] 1.1 使用包内 updater 升级三套完整 Skill，并建立所有既有记录可由新版 CLI 严格读取的显式 legacy-ID 中间态。
- [x] 1.2 通过 Decision / Investigation rename 事务迁移全部 dated ID、关系、资源 owner/link 与 schema v4 索引。
- [x] 1.3 更新 Decision adapter 类型、项目治理路由、生命周期/命令说明及两条长期 Decision。
- [x] 1.4 删除 `changes/archive/` 与整个历史 OpenSpec `archive/`，并去除当前文档和 active Change 对被删路径的依赖。

## Verification

- [x] 2.1 运行最新版 change-plan collection、Decision strict check、Investigation full check 与 ID/资源/链接残留审计。
- [x] 2.2 运行 scripts typecheck/lint、docs/workspace validation、test evidence closure 和相关 adapter tests。
- [x] 2.3 运行 `bun run check -- --all`，审阅完整 diff、删除范围、长期 owner 与未验证边界，并报告迁移 Change 的独立完成删除授权。
