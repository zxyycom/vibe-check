---
title: 发布前确认配置定义、Package Run 与 package 契约名称
status: archived
alignment: unaligned
createdAt: 2026-08-14T08:18:33Z
purpose: 防止 package、配置定义函数、Package Run、类型和运行标识偶然成为首个公开契约。
background: 产品显示名与 npm 安装名、两个 API roles 和 operational identifiers 承担不同兼容承诺。
decision: 发布候选前逐项确认 package、配置定义函数、Package Run、必要类型与运行标识的公共名称。
relations:
  - type: 修订
    target: product-contract/confirm-package-contract-names-before-publication.md
---

## 目的

- 保留 Vibe Check 已有产品身份，同时让 npm package、配置定义函数、Package Run 与必要 types 各自获得符合消费者和兼容成本的名称。
- 让后续 agent 区分已建立的产品显示名、两个 public operation 的语义角色、项目自有文件，以及尚未确认的 package 标识。

## 背景

- Registry package name、import/export specifier、配置定义函数与 Package Run symbols、public types、默认 effect paths 和环境变量名会进入代码、lockfile、文档与生态索引，具有独立兼容成本。
- 项目配置文件和运行脚本由项目自行命名和组织；canonical example path 不自动成为 Product discovery 或兼容性契约。
- Root manifest、repository path、source file、Change 名称和示例字符串服务当前开发上下文，不能替代首次公共命名判断。

## 决策

- 采用: Vibe Check 继续作为 public product/display name；本方向不把显示名自动转换成 registry package、import、symbol、路径或环境变量名。
- 采用: Publishable candidate 形成前，逐项确认 registry package name、public import/export specifier、配置定义函数、Package Run 与必要 public definition/control/result types 的 symbols、公开可观察的默认 output/cache paths，以及受支持的 operational environment identifiers。
- 采用: 每项确认都核对目标消费者、名称表达的能力范围、registry ownership 或 collision、与其它 surface 的关系，以及未来并存、迁移或退役成本；字符串合法或 registry 当前可用本身不足以完成判断。
- 采用: 实施后由一个 current public-contract source 完整承接 package-owned 名称；candidate manifest、declarations、canonical examples、docs 和 acceptance 只从该 owner 派生或核对，不建立第二份 name-set manifest。
- 采用: 项目配置文件和运行脚本的路径不是 package-owned 名称；Product 不发现这些文件，也不要求所有项目使用同一文件名。
- 采用: 本决策只建立命名范围和发布门禁，不选择 registry package、export、symbol、default effect path 或 environment identifier 的具体字符串。
