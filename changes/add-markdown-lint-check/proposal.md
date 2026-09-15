# Proposal

本计划交付一个由 Package 提供、使用闭合高信号规则检查 Markdown 结构与明确内容缺陷的 ordinary Check。

## Why

当前 Package 能验证 Markdown 本地链接与锚点，但不能报告标题层级、反向链接语法、代码围栏语言、
空链接、图片替代文本、未定义 reference 和表格列数等局部缺陷。调用方若自行接入第三方 linter，
还必须承担文件授权、配置收口、诊断规范化、资源限制和四态结算。

[`provide-bounded-markdown-lint-check`](../../docs/decisions/provide-bounded-markdown-lint-check.md)
已经确认：Vibe Check 应提供独立、Product-owned 且默认 advisory 的 Markdown lint 能力。

## Outcome

Package consumer 可以从根程序化 API 调用 `markdownLint(options?)`。无参调用使用稳定的八项默认规则；
非空闭合规则列表完整替换默认集。Check 只接收已授权的 Markdown 输入，并发布 Product-owned Records、
消息、final data 和普通四态结果。

## Scope

### Intended Change

- 新增 `markdownLint(options?)`、`markdown-lint` identity、闭合 options、final-data parser 和必要公共类型；
  只从 package root 导出。
- 以 exact `markdownlint@0.41.1` Promise `strings` API 作为私有 backend；Product 拥有输入读取、规则配置、
  输出验证、诊断文案、资源上限、取消和结算。
- 提供九个 Product 语义规则名，其中八项为默认集，same-document fragment 规则只允许显式选择。
- 默认逐文件、有序且无 persistent cache 地执行；按大小写不敏感的 `.md` / `.markdown` 资格分类完整对账
  selected paths。

### Resulting Impacts

- Product runtime：`src/package-checks/markdown-lint/**` 与 `src/index.ts`。
- Package material：生产依赖、lockfile、release manifest、public API/type inventory、candidate 与
  installed-consumer acceptance。
- 用户材料：新 Check 指南、README 索引、文档导航、package document registry、示例、类型验收与 changelog。
- 测试证据：配置、九项规则、方言、输入、limits、失败、取消、Records/messages、final data 与四态结算。

### Delivery Boundary

- 新 Check 独立于 `markdownLinkValidation`；后者继续拥有本地 target 与 anchor 完整性。
- 本 Change 交付 package capability，不改变 Project Gate selection。Repository dogfood 另行评审语料、
  exclusions、blocking migration 与 preset membership。
- Persistent cache 由下游 `design-markdown-check-caching` 在本 Check 契约稳定后决定。

## Success Criteria

1. `markdownLint()` 与合法自定义规则列表形成完整、冻结、可准备的 Check；未知字段、空/重复/未知规则和
   越界 limit 在 constructor 或 preparation 边界 fail closed。
2. Exact authorized Markdown inputs 在固定 front matter、inline-config 与规则 policy 下产生确定排序的
   lint Findings；不合格 selected paths 逐项形成 non-blocking `input-rejected` evidence。
3. Records 只包含 project-relative path、公共规则名和有效的一基 UTF-16 range；消息与 final data 使用
   Product-owned vocabulary，不泄漏第三方 message、context、source、fix、URL 或异常。
4. Zero selected、all-rejected、无 lint Finding、advisory Finding、blocking Finding、whole-Check failure 和
   cancellation 分别由测试证明；失败不发布 partial lint Findings。
5. Release manifest、candidate artifact 和 installed external consumer 都解析并执行 exact backend dependency；
   公共 API、随包文档、示例和类型声明保持闭合。
6. 目标测试、Case、文档、Decision、dependency、entry 与 package checks 通过；`bun run check` 通过，且由
   非实施代理依据实际 diff 完成语义反查。

## Affected Owners

- Product runtime 与公共入口：`src/package-checks/markdown-lint/**`、`src/index.ts`。
- 文件、结果和 dependency contracts：`docs/development/project-files.md`、
  `docs/development/check-results.md`、`docs/development/scanner-dependencies.md` 及相邻实现。
- Package 与用户材料：`package.json`、lockfile、release manifest、`docs/checks/**`、README、导航、示例与验收。
- 长期判断、测试证据和 Change 顺序：`docs/decisions/**`、`docs/testing/**`、目标 tests、
  `docs/governance/change-coordination.md`。
