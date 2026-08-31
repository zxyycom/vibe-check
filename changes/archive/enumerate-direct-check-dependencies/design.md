# Design

本设计把批量读取建模为现有 direct dependency reader 的枚举操作，而不是建立全局 Check registry或调度历史观察面。

## Context

Definition normalization已经把每个 executable Check的 effective `dependsOn` 去重并按文本排序。Scheduler保证 direct dependency先形成terminal settlement，`createCheckDependencies`再通过同一 Core session向 consumer提供 `get(checkId)`。

现有 `dependencies.get`只授权 direct dependency：`passed`/`failed`返回canonical data，`not-applicable`/`unavailable`返回带status的不可读结果。用户需要的是对这一显式集合进行批量检查，而不是读取任意 Check或修改上游。

三个表面相近的能力具有不同语义，本 Change 只增加中间一项：

| 能力                        | 授权集合                                         | 顺序与用途                                 | 本 Change    |
| --------------------------- | ------------------------------------------------ | ------------------------------------------ | ------------ |
| `dependencies.get(checkId)` | 一个已声明 direct dependency                     | 精确读取 provider data；保留未声明 ID 诊断 | 保持现有行为 |
| `dependencies.list()`       | 当前 Check 的全部 normalized direct dependencies | 按稳定 Check ID 顺序批量检查四态终态       | 新增         |
| 全局“已经执行的 Checks”     | 由当次调度时序偶然决定                           | 并发下不稳定，也绕过静态 graph             | 不提供       |

“后续操作”只表示 consumer 根据这些只读上游事实执行自己的逻辑、I/O、Records、messages 和 terminal result；它不获得修改、取消、重跑或重新结算 upstream Check 的能力。

active Decision `drive-run-from-check-owned-inputs-and-explicit-providers.md`要求跨 Check数据通过 producing Check、direct `dependsOn`和provider parser显式传递。本 Change延续该方向，并需要记录枚举仍服从相同授权边界。

## Goals / Non-Goals

**Goals**

- 让 audit、summary和follow-up Check无需复制dependency ID遍历逻辑即可读取全部direct upstream outcomes。
- 保持结果集合、顺序、数据身份和失败语义与静态graph一致。
- 让 TypeScript consumer能穷尽处理四态并继续使用provider parser。

**Non-Goals**

- 不暴露全局“已经执行”列表、当前scheduler状态、transitive dependencies或未声明Check。
- 不允许修改、取消、重跑或重结算upstream Check。
- 不允许execution动态增加dependencies，也不根据outcome改变graph。
- 不把afterGate的完整settled snapshot与execution dependency reader合并成同一API。

## Decisions

### Intended Change

1. `CheckDependencies.list()` 返回冻结的 direct dependency observation 数组。每项使用 `{ checkId, outcome }`，其中 `outcome` 复用已经 canonicalize 并 deep-freeze 的 `CheckOutcome`，直接覆盖四态而不把正常 `not-applicable` / `unavailable` 伪装成读取错误。
2. 列表按Definition normalization后的dependency ID顺序形成；该顺序当前为去重后的文本排序，不读取settlement Map插入顺序。
3. `list()`从与`get()`相同的session owner读取每个已结算outcome；它不调用`get()`制造逐项未声明分支，也不返回`dependency-not-declared`这种对枚举不可能的状态。
4. `get()`继续服务精确provider read和未声明ID诊断。consumer从list item读取`passed`/`failed` data后，仍调用producer `parseData`恢复领域类型。
5. 建立或演进长期Decision，明确direct dependency enumeration不是ambient registry；公共文档用一个批量审计示例说明owning Check只能形成自己的side effects和result。

### Resulting Impacts

- 需要一个最小 supporting list-item类型以表达`checkId + CheckOutcome`，但不新增registry、iterator class、query/filter DSL或generic parser。
- Diagnostic logging应记录一次有界`dependency.list` observation及数量/IDs或等价安全事实，不复制完整upstream data。
- 手工伪造`CheckExecutionContext`的测试支持代码需要同步；应优先复用现有factory，避免到处复制reader shape。
- `CheckOutcome`值必须保持现有canonical ownership；若实现复制容器，不得重新解释或改变data/reason。

## Risks / Trade-offs

- 批量读取可能让consumer过度依赖多个producer shape；显式`dependsOn`、稳定ID和provider parser仍是审查边界。
- 返回完整outcome比复用`DependencyReadResult[]`多一个supporting shape，但排除了枚举中不可能出现的`dependency-not-declared`，使合法状态更准确。
- 对大量direct dependencies线性构造数组是预期成本；没有真实性能证据时不增加lazy iterator或cache。

## Open Questions

无。用户已确认需要的是显式direct dependencies的稳定`list()`，而不是全局调度历史。
