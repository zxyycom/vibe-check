---
title: 发布前显式确认每个公共名称
status: archived
alignment: unaligned
createdAt: 2026-08-12T09:12:51Z
purpose: 防止 repository、源码或示例中的现有名称未经产品判断就成为首个公开兼容性承诺。
background: Product name、registry identity、import specifier、固定项目路径与公共 symbol 会先于行为细节成为消费者发现和依赖产品的稳定入口。
decision: 所有 package 与配置 publication 名称必须在发布前逐项确认；现有内部名称不提供默认值，本决策本身不选择任何具体名称。
tags:
  - product-contract
relations:
  - type: 拆分
    target: use-versioned-npm-package-release-unit.md
---

## 目的
- 让每个公开名称都由其面向的消费者、语义范围、registry 归属和长期演进成本支持，而不是从当前 repository 或实现布局偶然继承。
- 让后续 agent 能区分内部定位名称、计划中的角色名称、尚未确认的候选和已经建立的公共身份，避免把示例文本误当成发布授权。

## 背景
- Public product/display name、registry package name、import specifier、公共 symbol、固定项目路径与资源名称是消费者发现、安装、配置、引用和讨论产品的第一层契约；名称一旦公开就会进入项目目录、代码、lockfile、文档和生态索引。
- Repository 名称、root manifest、source file、Change directory 与对话示例服务当前开发上下文，不证明相同文字适合未来公开产品。
- `0.0.x` 允许相邻版本发生破坏式变化，但不会让未经选择的名称失去即时契约影响；预稳定版本策略不能替代首次命名判断。

## 决策
- 采用: Publication surface 中的public product/display name、registry package name、export/import specifier、公共API与类型symbol、固定project discovery path、明确导出的资源名称，以及受支持的operational environment名称，都必须在进入publishable candidate前逐项获得明确产品确认。
- 采用: 当前 repository、product、package、source、Change 或示例中的名称只拥有其当前内部定位作用；构建、计划和 agent 不得把它们作为未来公共名称的默认值、兼容证据或占位批准。
- 采用: 公共名称确认必须同时核对目标消费者、名称表达的能力范围、registry ownership 或 collision、与其它 surface 的关系，以及未来并存、迁移或退役成本；只验证字符串合法或 registry 当前可用不足以完成命名判断。
- 采用: Candidate manifest、export map、公共声明、fixed project paths、starter、资源索引、文档示例与consumer acceptance使用同一组已确认名称；未确认名称是发布readiness blocker，不能由build、pack或publish automation临时补齐。
- 采用: 公共名称建立后的变更属于产品契约变化，必须同步对应 owner、迁移说明与验收；具体跨 package version 的兼容保证继续由版本策略和更具体 identity 决策承接。
- 采用: Built-in Check、Record、schema field 或其它已经由独立 identity owner 建立的名称继续遵守其自身决策；本决策不借 package 命名重新打开已确认身份。
- 采用: 本决策只建立选择与验收边界，不选择任何具体product name、package name、export subpath、symbol、fixed project path、resource name或environment variable name。
