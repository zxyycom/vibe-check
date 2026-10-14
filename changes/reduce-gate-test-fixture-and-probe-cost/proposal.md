# Proposal

减少 Gate 中重复隔离进程启动与路由测试的全仓工作，保留原证明目的和工程门槛。

## Why

本轮起点调查中，Gate 的成本主要来自 Check 工作，而非几十毫秒的 Scheduler control path。
Duplicate 的一个实体顺序启动十个隔离 probe，并发下多次触及默认 5 秒 deadline；
workspace focused routing 还重复执行真实全仓 JSON 验证。单独通过不证明并发成本或 deadline 余量充足。

## Outcome

同样的 cache acquisition、跨 Run identity 和 CLI routing 证据以更少启动和无关材料工作完成，
builtin mocks 仍不污染共享 runner，真实 CLI 与 validator 集成信号保留，Gate 预算和 Check 粒度不变。

## Scope

### Intended Change

- 在单个隔离 child 顺序运行十个新 Check/Run 的 probe sequence，每轮取得真实结果和局部计数快照。
- 将 workspace focused selection 证明绑定到 main 实际调用的内部 adapter seam，保留 default-all 与 retired-entry 真实 child。
- 原材料验证器、真实 failure fixture、退出和 diagnostics 仍按各自 owner 验证。

### Resulting Impacts

模块复用、mock reset、磁盘 mutation/version/input-list 顺序与 cache identity 必须重新证明。
CLI seam 不增加用户 flags，不把 spy 当作独立进程证据；同步实际 Case 与工具 owner。
不通过删除断言、拆 Check、提高 timeout/concurrency 或跳过验收改善数字。

## Success Criteria

- probe 全部十个场景保持原计数与结果，进程隔离和各 Run 新鲜事实不变，重复启动明显减少。
- focused argv、默认全任务和 retired/failure/exit 分支有与 owner 匹配的直接证据。
- 固定 Product 输入的完整 probe 新旧成对多样本计时、目标文件验证、Case 闭合、独立审查和集成 Gate 支撑采用；不承诺消除所有环境抖动。

## Affected Owners

[Duplicate Check](../../docs/checks/duplicate-detection.md)、
[repository material](../../docs/tooling/repository-material-validation.md)、
[Project Gate](../../docs/tooling/project-gate.md)、[测试策略](../../docs/testing/strategy.md)及
[编码规范](../../docs/development/coding-style.md)。
