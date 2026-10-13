# Proposal

为显式 Markdown parse-facts cache 提供容量提醒；本计划承接配置、输出和验收。

## Why

调用方管理单个 append-only JSONL cache 的容量，需要在文件持续增长时获得可操作提醒。

## Outcome

启用 cache 的调用方在首次实际读到超阈值文件时收到一次准确、非阻断的清理提醒。

## Scope

### Intended Change

增加 Markdown 专属 `warnAboveBytes`，可省略并默认 16 MiB；只利用首次 restore 已读 bytes 判断容量。

### Resulting Impacts

公开配置与 Check message 同步用户指南和长期 Decision；内部 owner 说明读取、恢复和消息交接职责。
验证阈值、once、无额外 I/O、失败与取消，并证明链接结算保持。

## Success Criteria

目标行为测试及 typecheck/lint、材料、Case、Decision 与 Change 检查通过；独立审查与完整 Gate 覆盖最终变更。

## Affected Owners

- [Markdown Link Check 指南](../../docs/checks/markdown-link-validation.md#parse-facts-cache)：配置、容量提醒和用户安全边界。
- [Markdown 链接解析](../../docs/development/markdown-link-resolution.md#markdown-link-parse-facts-cache)：恢复与 publication 不变量。
- [容量提醒 Decision](../../docs/decisions/warn-on-explicit-markdown-parse-cache-capacity.md)：采用理由与长期边界。
- [quality-runtime Cases](../../docs/testing/cases/quality-runtime.md)：当前行为证明。
