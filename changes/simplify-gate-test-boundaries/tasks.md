# Tasks

先冻结前测，按用户顺序实施，最后独立审查并停止本轮其它负载后测量；共享环境的外部活动另行记录，不包含未经授权的提交和 Change 删除。

## Readiness

- [x] 0.1 核对 main、已有改动、规则/owner、Case 起点及相关决策，划定子代理单写者责任。
- [x] 0.2 保存修改前完整 Gate 与四组局部两轮测量、命令、输入及资源身份，不重试性能失败。

## Implementation

- [x] 1.1 删除目录硬约束与构建源码写法锁，将保留的依赖边界测试降层并同步 owner/Case。
- [x] 1.2 将 package 路径、指纹/工具链及文档 guard 错层测试降到真实最窄入口，保留 caller 接线证明。
- [x] 1.3 缩减真实 Git 重复初始化与无关定时等待，保留真实适配边界及测试隔离。
- [x] 1.4 用私有策略缩小 function metrics 容量/取消测试，保持生产默认值和公开 API。
- [x] 1.5 收敛 Gate 命名与 routine/release-only/explicit-only 资格，同步发布接线证据、owner/Case 和长期决策。

## Verification

- [x] 2.1 非实施代理独立审查实际 diff、公开 API/默认值、测试证明和文档影响，清除实质阻断。
- [x] 2.2 最窄测试、全树 Case、typecheck/lint/format、材料、Decision/Change 等受影响工程验证完成。
- [x] 2.3 停止本轮其它负载后完成同类局部后测及正常 Gate 验收，区分删义务/改频率与执行优化，报告实际功能/性能结果与未验证边界。

## Evidence

### 最终结果

实施、定向修正及测量报告均经非实施代理独立复核，无未处理的功能阻断。实际前测、V1 失败、修正后 V2、局部原值和共享资源边界已保存于[本轮调查报告](../../docs/investigations/measure-gate-test-boundary-simplification.md)及其资源。

- V2 routine all：41 passed / 2 not-applicable，command wall 37.431→31.698 s；mean 2.276→2.024 s、P95 6.053→5.565 s，仍超过原 2/5 s 预算，exit 1。43→41 包含明确的频率取舍，不宣称纯执行优化或性能问题解决。
- 四组局部各两轮全通过，均值为 layout 2.630→1.909 s、package 2.636→1.590 s、function metrics 2.410→2.018 s、Git/timer 1.009→0.680 s。显式 consumer types（3 项）与 workbench（1 项）均 exit 0。
- 报告建立后另运行一次交付 `mise exec -- bun run check -- --changed`：39 passed / 4 not-applicable，功能无失败；elapsed-to-initial 30.939 s 超过 30 s、P95 6.513 s 超过 5 s，exit 1。此轮不是 V2 性能对照的追加样本，也不替代其结果；现场为 `.log/project-gate/2026-10-24T04-35-40.626Z-871578-52f70746-1e64-4ddb-97e3-d02925355e32/`。
- 最终固定 Bun 验证：`validate` 507 JSON / 5 schema / 620 Markdown；Case 781 entities / 192 Cases / 16 topics；Decision 377；Investigation 121、index current；`format check` 1,017 文件及 `git diff --check` 均通过。格式入口曾误传 `--check`，仅返回 usage，随后以公开 `check` 参数通过，未据此修改代码。
- typecheck/lint 与各 owner 测试已由局部验证及完整 Gate 功能结果覆盖。正式 release receipt / release prepare / verify 未运行；focused types 不替代正式 tarball 的发布证据。

性能预算未通过是保留并报告的结果，不因任务勾选变为通过；本任务的实施与实测目标已经完成。未 stage、commit 或 finalize，当前 Change 留存等待用户决定版本保存与结项。

### 实施与验证过程

前测 source 3,395 项 SHA-256 `ed8bec8514e6a7cbe19f3592c269fc89f420e6b9e97079867f94f6cf046ee63f`，HEAD `d15cbf6f34499fa3027ed6c99d0508436add740f`，工具 Bun 1.3.14 / Node 24.18.0 / pnpm 11.1.3。输入、candidate、工具和 dirty 状态在前测前后不变。完整 Gate 原始现场位于 `.log/project-gate/2026-10-24T03-41-43.582Z-780042-97f0de44-ae72-48f1-b53d-4f25c66c569d/`。

第一阶段删除目录和源码写法锁，21 项真实依赖负向变体降为内存 policy 测试，保留少量 FS 接线及 package-tools/Core 实际解析。局部 3 tests、scripts typecheck/lint、完整 validate、format 和 diff 检查通过；Case 为 781 entities / 192 Cases。最终 Gate 阶段仍需移除 eligibility 静态输入清单对已删 `project-gate-layout.ts` 的引用，独立审查与整体验收尚未完成。

第二阶段 package 降层完成：13 项局部测试、7 项真实 artifact 测试、Case 全树、scripts typecheck/lint、完整 validate、format 和 diff 检查通过。直接 guard 由实际 artifact/docs caller 使用；installed docs 正向和同候选 Gate 分支留最终验收。第一阶段另经非实施代理审查无阻断，并独立通过内存矩阵与 Case 闭合。前两阶段普通验证使用默认 PATH 的 Bun 1.4.2；前后性能和最后整体验收统一固定 mise Bun 1.3.14，不将两类运行混为同工具对照。

第三阶段已减少三处真实 Git 初始化，barrier 替代无关等待，learned scheduling 复用已有 clock 并核对持久化的 2/30 ms 与后续顺序反转。function metrics 小容量测试走同一生产读取路径，保留 8/64 MiB 默认、等值/+1、跨 chunk、累计、整批及零 Worker 超限证据，真实 timer/I/O/Worker 资格测试保留。实施代理以固定 Bun 1.3.14 通过 36 项局部测试、Product typecheck/lint、Case、validate 和格式检查；非实施代理独立通过 32 项测试与 Case 781 entities / 192 Cases / 16 topics，审查无阻断。第二阶段也已独立审查无阻断，并以固定 Bun 通过五文件 12 项测试与全树 Case。

最后 Gate 阶段保留 `--test`，新增两个显式入口；完整 manifest 仍 43 项，routine all 41 项，receipt all 42 项。四扫描 ID 与配置、原预算、runner 数量不变。固定 Bun 通过 48 项局部测试、scripts typecheck/lint、Case、506 JSON / 5 schema / 619 Markdown 的 validate、377 条 Decision 完整检查、格式与 diff 检查。两条长期决策已 evolve 为对齐的新后继，旧记录归档；归档引用已机械修复。此时真实 consumer types、完整 Gate 与性能后测仍未运行。

最后阶段非实施代理独立审查无阻断，以固定 Bun 通过 16 项目标测试、377 条 Decision 与 Case 781 entities / 192 Cases / 16 topics；并核对 selection policy、provider 依赖、四扫描和 owner/Decision 同步。各实施切面的独立审查均已完成，最后性能与安装验收窗口尚待执行。

首次完整后测 V1 发现局部验证未覆盖的质量阻断：learned test 为 305 code lines >300，import 分析函数 CCN 11 >10，Gate observation selection 函数 CCN 13 >10。实际 39 passed / 2 failed / 2 not-applicable，exit 1；性能预算未评估，不能宣称性能达标。现场保存在 `.log/gate-test-boundary-after-20261024-cVxbnt/`，不覆盖、不以重试取绿。相关任务重新打开；最小修正与独立复核后，另以新的 source identity 启动 V2。learned fixture 已由同构数据表消重，全部断言保留，单文件 SCC 296 code lines；4 tests、Product typecheck/lint、format 和 diff 检查通过，其余两处修正与独立复核尚待完成。

V1 三项修正均已完成自验：import/re-export 共享收集路径，由独立语法 predicate 表达 type/value 差异，主函数 CCN 9；Gate 用三行 policy 包含关系表表达自动选择闭合，CCN 10，并在既有实体中独立枚举九对 policy 真值。局部 3 + 7 项测试、scripts typecheck/lint、format/diff 和全树 Case 通过，未修改限制、waiver 或 runner。三项修正的独立复核尚待完成。

V1 修正已独立复核无阻断：对比 V1 测试快照确认无断言删除，核对 AST 与 policy 的等价性；固定 Bun 独立通过三项最窄实体测试及直接调用 analyzer 的语法矩阵。现在冻结新输入以执行 V2，V1 的功能失败与未评估性能事实保持不变。
