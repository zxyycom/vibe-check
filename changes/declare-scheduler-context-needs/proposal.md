# Proposal

为 Scheduler 的策略与终态消费者建立兼容的可选需求声明；实施与上轮验收已完成，Plan 保留设计和交付依据，未结项删除。

## Why

实施前 static decision 虽不消费全部动态事实，仍经完整 inspection、settled 表、blocker summary 和 candidate facts 的逐轮物化。custom strategy 无条件请求在线 measurement；terminal effect 存在又与完整 measurement collector 和 sealed context 的形成绑定。仅删局部复制不能分开消费者需求与事实生产责任。

本方案采用保守兼容路线：需求可选，未声明获得完整上下文；Core 按阶段验证、合并需求。兼容范围包含旧 function authoring 与运行时契约，公共输入槽的联合类型仍可能要求调用代码先收窄，详见 design。

候选全扫等必要成本保留；收益以本轮冻结源码测量判断，旧 CPU 份额与准备耗时不作为当前收益。验收同时看规模收益与绝对成本，不要求所有 case 更快，不引入经验尺寸阈值。

## Outcome

- 原 function-only simple/prepared strategy 与 terminal effects 保留完整冻结上下文、调用顺序、terminal shared identity、故障与取消语义。
- opt-in 消费者声明阶段字段，Core 合并需求与固定执行／诊断义务，只生产必需事实。同阶段共享同一冻结对象；类型仅保证自身声明字段，不表示权限或排除其它字段。
- static/no-observer 不构造完整 inspection、settled/blocker DTO 或观察专用 candidate facts；opt-in custom 不请求 measurement 时不因 custom 本身启动 collector。候选全扫与真实准入 guards 保留，不宣称整个 R05 降阶。
- terminal delivery 与 raw measurement 分离；none/graph/execution-only effect 仍在真实 drained/sealed 边界投递，无 raw demand 时不启动完整 timing/queue/delay 采集。
- 类型 helper、closed grammar、需求闭包、单一执行事实源、文档、示例与 package declarations 可核对。

## Scope

### Intended Change

callback slot 接受原 function 或 `{ contextNeeds?, callback }`；阶段为 preparation、decision、terminal，省略/自有 undefined 为 full，显式 [] 为 none。提供 `defineSchedulerContextCallback` 获得 phase-specific literal tuple/Pick 推导；runtime descriptor 直接合法，不承诺 raw TypeScript inline descriptor 的字段推导。needs 与 callback 同属 runtime 消费配置，不进入 declarative fingerprint。

Core 按阶段 union + 私有生产依赖闭包构造共享投影；static 使用薄事实查询，公开 opt-in custom 兑现按需物化。terminal handoff 独立于 collector；可选 ShellAdmissionFacts 唯一维护 first-admission order，terminal 与 collector 消费此来源，settled 继续读现有 settlement facts。

不改选择算法、hard guards、captured measurement prefix、完整 diagnostics、输出 schema 或 Check facts；不引入跨 Run 缓存、第二套全量 index、Promise mailbox、mutex 重写或一般 hook registry。准备事实复用由另一个 Change 拥有。

### Resulting Impacts

- Definition closed validation/normalization、prepared-result validation、public Scheduler types、defineAdmissionPolicy exact checks、新 helper/root export 与 installed declaration consumer 必须共同接线。
- Invocation、策略 provider、Check scheduler 交接阶段需求；Scheduler decision/projection、execution facts、collector 和 terminal delivery 必须共同保持生命周期语义。
- 与 prepared-invocation-facts 共享入口串行写入，先复核实际接口及 diff；不覆盖其它会话改动。
- 公共 input slot 的 union 扩展影响 workbench 私有 fixture 类型；按固定 registry 的真实 function-valued 输入收窄，不新增 descriptor interpreter/公开 normalization API。filemetrics 必要影响由 learned 类型 owner 和 Scheduler observation setup 职责提取闭合。
- 更新稳定 owners、随包指南、示例投影、API inventory，以及按测试策略维护行为/类型证据；长期判断由需求声明 Decision 承接，不创建新 CLI、依赖、报告或其它正式 Decision。

## Success Criteria

1. legacy/full、none、minimal 与同 phase 混合可验；terminal participants 同一 context identity，不同 decision boundary detached，未声明 full 不变。
2. 闭合字段/阶段 grammar 拒绝 unknown/accessor/hole 等非法输入；声明 snapshot 不受 caller 后改影响；typed helper 保证 Pick/exactness、旧 function 完整推导，raw descriptor 静态边界如实公开。
3. 操作级证据表明 static/no-observer 跳过全 inspection/观察投影；选择仅 candidates/runtime 的 custom 不生产历史 DTO/在线 reader；terminal none/graph/execution 不启动 raw collector，未声明与 diagnostics 保留完整采集。
4. ShellAdmissionFacts 单一 first-admission source，collector 不保留同义 Set；settled 无第二 ledger。blocked/pre-admission/pending-cancel 不算 admitted，drain 后取消/policy-fault effects 正常交付。
5. legacy/no-demand/mixed-none/graph/execution/raw terminal、prepared 最后、失败继续/priority、measurement captured prefix、standalone scheduler 和真实 guards 回归通过。
6. 受影响 source types、installed declarations、稳定文档/示例/API inventory 闭合；在独占窗口完成 public Run before/candidate 正式 benchmark，保留绝对成本、小图代价和噪声；组合 Gate 与计时分别验收。

## Affected Owners

- [Scheduler](../../docs/development/scheduler.md)：decision、admission source、projection、diagnostics/measurement、terminal delivery。
- [Project Run](../../docs/development/project-run.md)：prepare、Run-local 需求交接、prepared terminal effect。
- [Project Definition](../../docs/development/project-definition.md)：closed grammar、normalization 与 fingerprint；[package tools](../../docs/development/package-tools.md)：exact authoring helper。
- [公开调度指南](../../docs/guides/scheduling.md)、[测试策略](../../docs/testing/strategy.md)、[文档导航](../../docs/navigation.md)的 API/package/示例交付入口。
- [Workspace tooling](../../docs/tooling/workspace.md#virtual-admission-workbench)：exact-candidate workbench 固定 registry / function-valued fixture 的私有适配契约。
- [需求声明 Decision](../../docs/decisions/archive/declare-scheduler-context-demand.md)（261013-declare-scheduler-context-demand）：形成时为 active/aligned，完整方向已按当时源码、独立审查和安装包验收核对；该方向现已修订归档。
