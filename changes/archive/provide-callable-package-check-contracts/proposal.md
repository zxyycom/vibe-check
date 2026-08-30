# Proposal

本 Change 把七项随包 Check 收敛为可调用、可解析且能对自身问题给出可行动消息的类型化公共契约。

## Why

当前公共 API 同时存在 constructor 与完整 Check value，三个 format Check 的定制依赖普通对象组合；七项 Check 也没有统一提供 final-data parser，随包失败路径并不总能通过 `RunResult.checkMessages` 给出下一步。用户已经确认三个 value 应硬切为补默认值的函数、所有随包 Check 应提供对应解析器，并要求随包 Check 为自己明确结算的失败、不可用与非阻断 finding 提供安全可行动消息。

## Outcome

安装包 consumer 能从 package root 调用七项领域函数构造普通 Check，使用随 Check 和命名导出的 parser 安全恢复每项 final data，并在随包 Check 自己能解释的问题发生时从结构化 message 直接取得定位或处理入口；公共类型、文档、examples 与 candidate acceptance 对同一契约形成证据。

## Scope

### Intended Change

- 将 JSON、JSON Schema 与 Markdown Link 的完整 value 改为接收可省略 options 并补齐默认值的函数，保留 resolved options 防御边界。
- 为七项随包 Check 定义并导出 final data parser 和必要的 options、final data、Record data、unavailable reason 类型。
- 为 Check-owned failed、unavailable 与 non-blocking finding outcomes 增加安全可行动 messages，同时保持 generic Check messages optional。
- 更新公共 inventory、JSDoc、README、Check guides、安装示例和 SCC/Lizard 可复现安装说明。

### Resulting Impacts

- 现有 `jsonValidation`、`jsonSchemaValidation` 与 `markdownLinkValidation` 调用点、测试和文档必须从 value 切换为函数调用，不保留兼容别名。
- Parser 必须严格验证 canonical object 且能直接服务 typed dependency；Record 和 reason 类型不能暴露 private scanner 或敏感 material。
- 新增或修改的测试实体与 Semantic Cases 必须保持 public authoring、constructor、parser、message 和 isolated consumer 证明闭合。

## Success Criteria

- 七项 package Check exports 都是函数，并在默认与定制调用中返回完整冻结的 ordinary Check。
- 七项返回 Check 都包含验证自身 final data 的 `parseData`，package root 同时导出可独立调用的命名 parser 与必要公共类型。
- Check-owned failed、unavailable 和 non-blocking finding 分支具有安全、稳定且可行动的 messages；自定义 API 文档明确 messages 仍为可选。
- SCC 3.7.0 与 Lizard 1.23.0 的可复现安装和 probe 方法出现在各自 Check guide。
- 目标测试、Test Evidence、docs/package projection、typecheck/lint 和 full package candidate verification 通过。

## Affected Owners

- `docs/configuration.md`、`docs/quality-metrics.md`、`docs/scanner-dependencies.md` 与 `docs/coding-style.md`
- `src/package-checks/**`、`src/index.ts` 与相邻 package Check tests
- `README.md`、`docs/api-mechanics.md`、`docs/checks/**`、package examples 与 public inventory/candidate acceptance
- `docs/testing/cases/**` 与 Test Evidence closure
