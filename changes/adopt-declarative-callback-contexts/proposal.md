# Proposal

统一 Product 的声明式 callback context，使框架注入字段按静态需求生产、按消费者精确交付，并完成一次 breaking API 迁移。

## Why

Check、Scheduler 与 command Check 的扩展点目前以不同签名提供框架字段；Scheduler 还默认提供 full context，并向同阶段消费者交付需求并集。
调用方难以从声明判断自己实际依赖什么，生产者也无法稳定地关闭无人使用的投影、历史和逐 Task 测量。

本次将业务输入与框架注入分开，以通用 helper 自动推导声明字段，并把采集开关固定在相应生命周期开始之前。
本项以[通用 helper](../../src/package-tools/context-callback/define-context-callback.ts)承接声明驱动类型推导，并兑现运行时精确交付。

## Outcome

每个纳入的 callback 只声明、获得和静态读取自己需要的框架字段；生产者根据固定需求及执行义务完成最小必要工作。
业务输入仍直接传入，领域生命周期、权限和旧快照保持稳定。仓库消费者与随包材料统一使用新契约，本项可独立交付。

## Scope

### Intended Change

- 按[覆盖与生产清单](callback-surfaces.md)改造 Check `prepare`/`execute`、Scheduler preparation/decision/terminal 及 command Check 的 environment/completion callbacks。
- 提供通用 `defineContextCallback`、共同 descriptor grammar、阶段合法字段与自动 context 类型推导。
- 默认空需求；验证、复制并固定声明；共享底层生产，分别交付消费者精确视图。
- 拆开 Scheduler 累计统计、action history、Run 统计和逐 Task timing 的生产需求。
- 完成随包 Check、learned strategy、仓库调用方、公开类型、示例、指南和升级说明的一次迁移。

parser、aggregation、formatter 与纯工具 callback 保持直接业务输入；Project Gate 自有 hook 继续由 Gate 拥有。
本项不引入运行中需求变更、沙箱、新权限、调度策略或底层索引/数值算法。

### Resulting Impacts

- Definition、command constructor 与 prepared-result boundary 接受并固定新声明；callback 与需求继续属于 runtime 配置，不进入 declarative fingerprint。
- `options` 从 Check execution context 移到业务参数；Scheduler 默认 full、阶段 union 外层和 terminal 共享外层 identity 改为精确视图。
- 当前需求声明 Decision 与公开/内部 owner 随实施演进；升级后只提供新契约，调用方恢复旧版本时同时恢复匹配用法。
- 本项完成生产开关、接线和全部迁移后，再推进 [Scheduler 增量重构](../restructure-scheduler-incremental-state/proposal.md)；本项不以该重构补齐交付。

## Success Criteria

1. 覆盖表中的每个注入位置均有合法字段、业务参数、验证/固定点、生产 owner 和迁移证据；保留直接输入的位置有明确理由。
2. helper 自动推导所声明 context，保留业务输入和返回类型；非法阶段、未声明字段、宽化/union 需求有正反类型证据。
3. 无声明、空声明、混合消费者和内部固定需求下，runtime own fields 与各自需求一致；生产探针证明未需求的可选工作没有执行。
4. 取消、能力授权、旧快照、terminal 调用顺序与失败优先级保持；统计分组保留测量定义和有效零时长、不可用分支。
5. 源码消费者、公共声明、实际安装包的 TS/JS consumer、示例、升级说明和稳定 owner 全部一致；没有旧运行时兼容层或待下一 Change 补齐的接线。

## Affected Owners

- [Architecture](../../docs/development/architecture.md)、[Project Definition](../../docs/development/project-definition.md)、[Project Run](../../docs/development/project-run.md)：机制归属、验证、生命周期和能力生产。
- [回调位置](../../docs/guides/callbacks.md)、[Check lifecycle](../../docs/guides/extending-check-lifecycle.md)、[依赖数据](../../docs/guides/check-dependencies.md)、[command Check](../../docs/guides/command-check.md)：业务输入与注入契约。
- [调度指南](../../docs/guides/scheduling.md)、[Scheduler](../../docs/development/scheduler.md)、[learned strategy](../../docs/guides/learned-scheduling.md)、[随包工具](../../docs/development/package-tools.md)：需求分组、统计和实际消费者。
- [API 机制](../../docs/api-mechanics.md)、[Run outputs](../../docs/guides/run-outputs.md)、[Human output](../../docs/development/human-output.md)：不受字段裁剪影响的聚合、交付与诊断义务。
- 各随包 Check guide、[文档材料](../../docs/tooling/documentation.md)、[包产物](../../docs/tooling/package-artifact.md)、[包生命周期](../../docs/tooling/package-lifecycle.md)、[测试策略](../../docs/testing/strategy.md)：调用方迁移、声明/示例与验证。
