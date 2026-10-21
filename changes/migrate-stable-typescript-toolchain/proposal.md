# Proposal

以官方并存方案用稳定 TS7 编译器替代 native-preview，同时保留现有 TS6 程序化 API。这是本次已授权实施的临时计划。

## Why

native-preview 已是过渡渠道；稳定 TS7 不可机械覆盖当前 AST/compiler API consumer，但官方提供并存兼容包。

## Outcome

真实 typecheck/emit/consumer 使用稳定 TS7 7.0.2；现有 import typescript 经官方兼容包继续获得 TS6 API，旧 native-preview/tsgo 生产接线退出，fingerprint 与 cache 识别真实工具链。

## Scope

### Intended Change

采用 @typescript/native: npm:typescript@7.0.2 与 typescript: npm:@typescript/typescript6@^6.0.2；兼容包通过其依赖重导出实际 TS6 API。统一按包 manifest/bin 解析入口，不移植 AST 消费者到不稳定 TS7 API。

### Resulting Impacts

移除 native-preview、切换 tsc 入口并更新硬编码 consumer 路径；工具链身份覆盖 compiler、平台 executable、compat wrapper 与真实 TS6 API。保留源与 emit 的六项 soundness 规则、Worker URL exact-once rewrite、独立 consumer profile 及相邻声明 JSDoc 证据。
清理 pnpm-workspace 中退役版本的精确发布年龄例外，仅保留已批准目标的必要精确例外，不关闭全局保护。
必要依赖声明适配（Execa 精确声明补丁、markdown-it dev-only 类型来源）与 workspace 约束进入指纹输入，
以实际 emit/consumer 证明严格类型规则保持且公开声明不泄漏兼容依赖。

## Success Criteria

- 目标版本及实际安装、发布清单一致，最窄行为证据和最终完整 Gate 均通过。
- 实际差异、稳定 owner、Case 与必要交接同步；按本轮授权保存 Git 完成态、运行提交 hook 并正常结项，正式发布另行授权。

## Affected Owners

scripts/development/typecheck.ts；scripts/package/artifact/** 与 candidate external types；docs/tooling/workspace.md、package-artifact.md、package-lifecycle.md；repository-tooling Cases。
