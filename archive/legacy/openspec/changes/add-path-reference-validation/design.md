> **核心句：**本 design 只固定 project-local path reference check 的产品责任与范围边界，不把旧的 literal classifier 猜测延续为实现方案。

## Context

文本路径引用是内容质量问题：读者应能从项目文档或其它受支持文本到达被引用的项目对象。它不同于 import/module dependency，也不同于 Markdown link destination 的专用语义。新的 Check/Record Core 允许该领域由独立 runner 拥有，不需要让 Core 认识路径分类规则。

## Goals / Non-Goals

**Goals:**

- 发现获准文本中无效、无法解析或越界的 project-local references。
- 用安全、规范化的 project-relative 信息帮助用户定位源与目标。
- 严格遵守 resolved global scan scope，不因文本引用而扩大扫描范围。

**Non-Goals:**

- 不构建 import、module、package 或架构依赖图。
- 不复制 Markdown link check 对 link destination 和 anchor 的专用所有权。
- 当前不固定支持的文本格式、path grammar、literal policies、record fields、identity、排序、缓存或 comparison。
- 不读取或展示项目范围外的宿主绝对路径，也不递归扫描被引用内容。

## Ownership Boundary

| Owner | 高层责任 |
| --- | --- |
| Project Definition | 声明是否采用该内置 check 及其届时支持的产品规则。 |
| `quality-checks` | 提供 resolved invocation、运行生命周期和最终 CheckResult 边界。 |
| Path reference CheckRunner | 从获准文本识别 project-local references、验证边界与目标，并决定最终 records。 |
| `quality-records` | 校验、提交和发布 runner 产生的最终 records。 |
| Markdown link check | 独占 Markdown link destination 与 anchor 的链接语义，避免重复报告。 |

## Decisions

### Decision 1: 检查对象是文本中的 project-local reference

本能力关注文本对项目文件或目录的引用是否可用，而不是把所有 path-like token 都解释成问题，也不推断程序依赖关系。

### Decision 2: 引用不能扩大 resolved global scope

Runner 只解析 resolved invocation 批准的源文本。它可以在允许的项目范围内验证目标，但不得因为某个引用而读取或扫描 global scope 之外的文件。

### Decision 3: 公开结果保持 project-relative

Records 只携带完成定位所需的安全 project-relative 信息或安全边界分类；宿主绝对路径和范围外 raw target 不进入公开或持久边界。

### Decision 4: 实现细节延后到实施前审计

文本格式、引用语法、目标验证、误报控制和 record types 都需要依据届时真实项目样本与基础契约重新确定。Git 历史保留旧猜测，本 change 不为未实施内容建立兼容层。

## Risks / Trade-offs

- 自然文本中的 path-like 内容存在歧义；实施前应优先选择可解释且高置信度的引用场景，而不是追求覆盖所有字符串。
- 与 Markdown link check 的输入可能重叠；实施前必须用 occurrence ownership 防止同一 link destination 重复报告。

## Open Questions

无需要在当前方向阶段回答的问题。实现细节将在 `tasks.md` 1.1 的重新基线与阻塞审计中确定。
