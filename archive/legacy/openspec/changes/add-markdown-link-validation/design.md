> **核心句：**本 design 只固定离线 Markdown link check 的 owner、项目范围和隐私边界，不提前设计解析算法或外链协议。

## Context

本地链接正确性与网络可达性具有不同的确定性、安全成本和运行边界。新的 Check/Record Core 允许 Markdown link runner 自行产生最终领域 records，因此两类问题无需再被塞进一个 Core pipeline。

## Goals / Non-Goals

**Goals:**

- 离线发现获准 Markdown 中失效或越界的项目本地目标与锚点。
- 让结果使用安全的项目相对定位，不读取项目允许范围之外的目标。
- 识别非本地链接并为未来独立 network check 保留清楚的 owner 边界。

**Non-Goals:**

- 不执行 DNS、HTTP、TLS、重定向、重试或其它网络工作。
- 当前不固定 parser、Markdown 方言、anchor slug 算法、URL normalization、candidate/record fields、identity、排序、缓存或 comparison。
- 不持久化 raw/full URL、userinfo、query values 或其它可能敏感的请求材料。
- 不依赖 Markdown structure check 的启用、规则或实现。

## Ownership Boundary

| Owner | 高层责任 |
| --- | --- |
| Project Definition | 声明是否采用该内置 check 及其届时支持的离线规则。 |
| `quality-checks` | 提供 resolved invocation、运行生命周期和最终 CheckResult 边界。 |
| Markdown link CheckRunner | 解析获准 Markdown，分类链接，验证本地目标/锚点并决定最终 records。 |
| `quality-records` | 校验、提交和发布本地链接 runner 产生的最终 records。 |
| Future network check | 独立决定网络请求与网络结果；不得反向改变本地验证事实。 |

## Decisions

### Decision 1: 本 change 保持离线

本能力只验证项目本地目标和锚点。非本地链接可以分类，但不得由该 runner 发起网络请求或产生网络可达性结论。

### Decision 2: 项目根与扫描范围先于目标读取

Runner 只解析 resolved invocation 批准的源文件，并在读取本地目标前确认其位于允许的项目范围内。越界目标只形成安全结果，不得作为扫描输入继续打开。

### Decision 3: 敏感 URL 材料不进入持久边界

若未来 network check 需要外链 handoff，实施前必须设计只传递必要信息的临时边界。Raw/full URL、凭据和 query values 不进入 records、日志、cache 或持久 artifacts。

### Decision 4: 实现细节延后到实施前审计

Parser、anchor 语义、目标解析、record types 和外链交接协议都需要依据届时实现与依赖重新确定。Git 历史保留旧猜测，本 change 不为未实施内容建立兼容层。

## Risks / Trade-offs

- Markdown 工具间的 anchor 规则可能不同；实施前必须从目标用户与真实文档基线选择语义。
- 外链分类仍可能接触敏感文本；实现前隐私审计必须先确定最小 transient material，再允许下游消费。

## Open Questions

无需要在当前方向阶段回答的问题。实现细节将在 `tasks.md` 1.1 的重新基线与阻塞审计中确定。
