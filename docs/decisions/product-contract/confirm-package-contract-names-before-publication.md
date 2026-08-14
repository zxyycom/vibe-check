---
title: 发布前确认 package 公共契约名称
status: archived
alignment: unaligned
createdAt: 2026-08-12T11:07:30Z
purpose: 防止 package、import、symbol、固定路径和运行标识从内部实现偶然进入首个公开契约。
background: Vibe Check 已是产品身份；npm package 与 API 标识承担不同的安装、调用和配置承诺，不能由产品显示名或当前源码布局自动推导。
decision: 发布候选形成前逐项确认全部 package 公共契约名称；Vibe Check 继续作为产品显示名，本决策不选择其它具体字符串。
relations:
  - type: 修订
    target: product-contract/approve-public-names-before-publication.md
---

## 目的
- 保留 Vibe Check 已有产品身份，同时让 npm package、API 和配置入口各自获得与其消费者和兼容成本相符的名称。
- 让后续 agent 能区分已建立的产品显示名、仅用于设计的语义角色，以及尚未确认的 package 公共标识。

## 背景
- Vibe Check 是当前产品和文档使用的显示身份；采用 npm API-first 架构本身不构成产品重命名理由。
- Registry package name、import/export specifier、公共 symbol、固定 Project Definition 路径、默认 effect 路径和环境变量名会进入代码、项目目录、lockfile、文档与生态索引，具有独立兼容成本。
- Root manifest、repository path、source file、Change 名称和示例字符串服务当前开发上下文。除已建立的 Vibe Check 产品身份外，它们不证明同一字符串适合成为公开 package 契约。
- `0.0.x` 允许相邻版本发生破坏式变化，但不能替代首次命名判断。

## 决策
- 采用: Vibe Check 继续作为 public product/display name；本方向不要求重新命名产品，也不把显示名自动转换成 registry package、import、symbol、路径或环境变量名。
- 采用: Publishable candidate 形成前，逐项确认 registry package name、public import/export specifier、两个公开操作及必要公共类型的 symbol、固定 Project Definition discovery path、公开可观察的默认 output/cache path，以及受支持的 operational environment identifier。
- 采用: 每项确认都核对目标消费者、名称表达的能力范围、registry ownership 或 collision、与其它 surface 的关系，以及未来并存、迁移或退役成本；字符串合法或 registry 当前可用本身不足以完成判断。
- 采用: 实施后由一个 current public-contract source 完整承接已确认值；candidate manifest、declarations、配置示例、文档和 acceptance 只从该 owner 派生或核对，不建立第二份 name-set manifest。
- 采用: Built-in Check、Record、schema field 或其它由独立 identity owner 建立的名称继续遵守其自身契约；package 命名不重新打开这些身份。
- 采用: 本决策只建立命名范围和发布门禁，不选择 registry package、export、symbol、固定路径、默认 effect 路径或 environment identifier 的具体字符串。
