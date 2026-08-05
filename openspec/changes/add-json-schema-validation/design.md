> **核心句：**本 design 只确定 JSON Schema Check 的显式绑定、离线解析和 owner 边界，不提前锁定 dialect、validator 或数据 shape。

## Context

JSON syntax validation只能证明文档可解析。JSON Schema validation还需要识别schema documents、建立schema-to-instance关系并解析引用，这些都不能由文件发现顺序或Core推断。新的TypeScript Project Definition适合承载显式declaration，而Check/Record foundation提供通用结果边界。

## Goals / Non-Goals

**Goals:**

- 只校验项目显式声明的 schema 与 instance 关系。
- 在无需联网的前提下安全解析项目批准的本地 schema references。
- 将 schema、binding 与 instance 问题归一化为 final QualityRecords，并独立返回 CheckResult。
- 保持底层 validator 可替换且不泄漏到 Core。

**Non-Goals:**

- 不自动扫描目录、按文件名猜测 schema、推断相邻 instance 或下载远程 references。
- 不在当前阶段承诺某一 JSON Schema dialect、compiler package、coercion、defaults、代码生成或自动修复。
- 不提前固定 Project Definition 字段、record catalog、comparison、cache 或完整兼容矩阵。

## Decisions

### Decision 1: Bindings are explicit project declarations

Project Definition 必须明确关联 schema identity、schema resource 与目标 instances。JSON Schema Check 不从目录邻接、文件名、发现顺序或其它隐式约定生成 binding。具体 declaration shape 在实现前与已落地 authoring API 对齐。

### Decision 2: Reference resolution is offline and local-safe

Schema references只能解析到实施时明确定义且经过验证的本地资源边界。缺失、不允许或无法安全解析的 reference 形成可解释的 check outcome；不得退回网络获取或越权文件读取。

### Decision 3: JSON and JSON Schema keep separate domain ownership

JSON Check 拥有严格文档解析方向；JSON Schema Check拥有schema semantics、binding和reference resolution。实现可以复用解析/location boundary，但不得要求Core理解JSON value、schema keyword或validator error。

### Decision 4: Dialect and engine selection are implementation-time decisions

支持的 dialect、validator dependency、错误归一化、source mapping、resource limits和测试矩阵都取决于当时可用的foundation与library证据。当前change只保留产品结果，不把候选实现写成长期契约。

## Risks / Trade-offs

- 不固定 dialect 会延后互操作边界，但避免在尚未排期时把未来实现锁死在未经验证的选择上。
- 本地 reference graph 仍可能复杂或耗费资源；实现审计必须确定安全边界和有界行为。

## Open Questions

当前没有需要提前决定的产品方向问题。dialect、validator 与 declaration 细节有意推迟到实现前审计，不能据此开始实现。
