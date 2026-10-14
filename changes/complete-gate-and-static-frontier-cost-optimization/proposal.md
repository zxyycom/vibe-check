# Proposal

按完整 Gate 成本链路减少重复解析、进程启动与调度枚举，并统一验收各独立切面。

## Why

用户要求一次覆盖本轮推荐的全部方向。43 项 Gate 成本 inventory 已建立；相同源码多次运行波动明显，
因此逐项按 parser、进程、compiler、质量扫描、调度与发布责任分类，不以单次总时长或局部热点代替全局判断。

## Outcome

完整验收保持；Markdown Link 复用已授权解析材料，static Scheduler 消费异构组的可运行前缀，
维护提醒和 workbench 按证明责任与输入边界减少重复进程启动和无效装载。
JSON 与 Core fixture 独立计划的结果共同进入最终 Gate，不以缩减 tests、阈值或公开承诺消除诊断。

## Scope

### Intended Change

Gate 显式启用现有 Markdown parse-facts cache；Scheduler 为三层策略维护 persistent globally ranked group heads，
由原 seed/transition 同步 ready membership、scope layer 与 entry revision。
维护提醒的七种测量失败/重试在 raw Git-result 边界验收原输入与独立结果，保留真实 transport/完整 Run 集成，移除每种解析变体重复的进程 bootstrap。
workbench 命令在参数、scenario 与注册 policy 验收后加载执行模块，使先验输入拒绝不装载 Product/模拟运行时。

### Resulting Impacts

同步内部 Scheduler owner、Gate 配置与长期采用理由；增强原测试实体和连续 Case。
测量 session 显式持有默认 runGit 的私有 command runner；public options/API 与全部并发设置保持。
execution 模块拥有 replicate workflow；entry 保留输入、输出与 failure mapping，装载失败在原错误路径中包含。
公共策略顺序、capacity/mutex/relation/cancellation、fork 与完整观察结果保持；candidate 与 consumer 验收重新运行。

## Success Criteria

1. 缓存冷态/命中均保持当前源读取、授权、target 验证与相同结果；Product 默认关闭不变。
2. 异构 mutex/resource 规模复测有明确收益，共享组路径保持；独立策略/状态对照、fork、取消和全部 Scheduler tests 通过。
3. 全部 43 项 Gate 成本已分类审阅；局部与组合证据分开，完整 Gate、Case、文档及编码规范独立审查通过。

## Affected Owners

- `docs/tooling/project-gate.md`、Markdown Link 指南与内部解析 owner。
- `docs/development/scheduler.md`、调度与模拟公开指南。
- 编码规范、测试策略/Case 维护与性能优化规则。
- Maintenance Reminders 指南与其连续 Case：核对原结果、失败、重试、顺序与取消义务。
- `docs/tooling/workspace.md#virtual-admission-workbench`：workbench 输入、执行装载与错误输出边界。
