# Design

以官方并存方案用稳定 TS7 编译器替代 native-preview，同时保留现有 TS6 程序化 API。

## Context

assess-typescript-upgrade.md、assess-typescript-native-preview-upgrade.md；260911 类型可靠性 Decision 与微软官方并存说明。
当前 main 基线为 a36600da4aa2e4d3f4dcebb87722e56d1200ee9d；开始时已有十九份未提交升级报告和调查索引，作为既有工作保留。

## Goals / Non-Goals

目标：真实 typecheck/emit/consumer 使用稳定 TS7 7.0.2；现有 import typescript 经官方兼容包继续获得 TS6 API，旧 native-preview/tsgo 生产接线退出，fingerprint 与 cache 识别真实工具链。
范围以本组已批准依赖和必要适配为限；不升级其余根库、不改变 mise/Node 支持范围、不修改既有调查的历史认识。

## Decisions

### Intended Change

采用 @typescript/native: npm:typescript@7.0.2 与 typescript: npm:@typescript/typescript6@^6.0.2；兼容包通过其依赖重导出实际 TS6 API。统一按包 manifest/bin 解析入口，不移植 AST 消费者到不稳定 TS7 API。

### Resulting Impacts

移除 native-preview、切换 tsc 入口并更新硬编码 consumer 路径；工具链身份覆盖 compiler、平台 executable、compat wrapper 与真实 TS6 API。保留源与 emit 的六项 soundness 规则、Worker URL exact-once rewrite、独立 consumer profile 及相邻声明 JSDoc 证据。
所有 package.json、pnpm-lock.yaml、node_modules 和 release-manifest 由 compiler_dependency_integration 单一 owner 串行写入；其余模块按明确所有权并行。主代理维护四组计划和最终验收，完整 Gate 在实现稳定后统一运行，失败时定向修复并重验，四组共享同轮证据。
pnpm-workspace.yaml 的版本例外同由依赖 owner 维护：移除退役 native-preview/jscpd 5.1.1 的精确例外，
保留 jscpd 5.4.2 实际 wrapper/platform 的精确例外；不扩大为通配符或关闭发布年龄保护。

## Risks / Trade-offs

compat wrapper 包版本不是实际 API 版本；bin 从 tsgo 改为 tsc、平台 optional 包与 cache identity 都要验收，不能只检查 version 行。

## Open Questions

当前方案已由用户确认。安装、行为差异与平台边界按实际验证更新，实质扩大范围时再确认。
