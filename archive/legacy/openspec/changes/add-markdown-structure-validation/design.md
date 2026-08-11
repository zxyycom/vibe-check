> **核心句：**本 design 只固定 Markdown structure check 的长期 owner 与不可跨越边界，不把尚未验证的 feature 细节写成实现契约。

## Context

该能力仍是未来方向。新的基础架构把 Check 与 Record 分开，并允许 Project Definition 组合内置和自定义 checks；因此 Markdown 解析和领域判断应留在内置 runner，而不是继续扩展 Core 的领域分支。

## Goals / Non-Goals

**Goals:**

- 发现会影响 Markdown 阅读和维护的结构问题，并提供可定位、可理解的最终 records。
- 只处理 resolved invocation 批准的 Markdown 输入。
- 让共享 Core 只管理 Check/Record 生命周期，让 Project Definition 只承担 authoring 与 resolution。

**Non-Goals:**

- 当前不固定具体 parser、Markdown 方言、阈值、rule/check/type ID、record fields、identity、排序、缓存或比较语义。
- 不做 Markdown formatter、自动修复、内容事实审查、链接验证或通用 Markdown lint 全集。
- 不把 `scripts/**` 中的仓库专用规则直接提升为产品契约。

## Ownership Boundary

| Owner | 高层责任 |
| --- | --- |
| Project Definition | 声明是否采用该内置 check 及其届时支持的产品规则。 |
| `quality-checks` | 提供 resolved invocation、运行生命周期和最终 CheckResult 边界。 |
| Markdown structure CheckRunner | 解析获准输入、判断领域问题并决定最终 record 内容与级别。 |
| `quality-records` | 校验、提交和发布 runner 产生的最终 records。 |
| Decision policy | 在共同快照上组合结果；本 feature 不固定 channel 或 comparison。 |

## Decisions

### Decision 1: Markdown 语义归内置 runner

Markdown structure CheckRunner 拥有解析、结构判断和 record 生成。Core 不解析 Markdown，也不把领域事实重新转换为 warning 或其它结果。

### Decision 2: 配置入口归 Project Definition

项目侧 authoring 通过 `project-definition` 进入 resolved check contract。本 change 只声明需要可配置的产品规则，不提前设计 TypeScript 对象或字段。

### Decision 3: 实现细节延后到实施前审计

Parser 选择、具体规则、record types、位置语义、错误处理和测试证明都依赖届时已落地的基础契约。Git 历史保留旧猜测，本 change 不为未实施内容建立兼容层。

## Risks / Trade-offs

- 不同 Markdown 语义可能产生不同结果；实施前必须用真实项目样本确定产品语义，而不是从旧 artifact 继承算法。
- “可读性”范围容易无限扩张；实施前应优先选择少量、高价值且可解释的问题，不以规则数量衡量完成度。

## Open Questions

无需要在当前方向阶段回答的问题。实现细节将在 `tasks.md` 1.1 的重新基线与阻塞审计中确定。
