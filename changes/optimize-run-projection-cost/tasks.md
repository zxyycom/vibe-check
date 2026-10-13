# Tasks

先固定消费边界与输入，再实施最小消除，以行为、性能和同产物验收分别闭合。

## Readiness

- [x] 0.1 读取公开调度、Scheduler/Project Run、编码及测试 owner，确认不变量和基线。
- [x] 0.2 独占窗口完成 Node 公开完整 Run ABBA、Bun 参考、源码身份、计数和取消顺序探针。
- [x] 0.3 审定 pending 保序、standalone supplied 顺序及 canonical candidate 字段/freeze 的等价依据。
- [x] 0.4 通过公开入口建立 Plan，范围为三个生产模块与一个既有测试正文。
- [x] 0.5 修改测试前完整 Test Evidence 通过 704/176/15，确认 Case 目的连续。

## Implementation

- [x] 1.1 落实 core + lifecycle 入口和 canonical candidates 复用，保留单一 decision owner。
- [x] 1.2 增强既有 abort/drain 测试的多 pending、逆序 supplied IDs、完整 settlement 和冻结断言。
- [x] 1.3 复核契约与文档影响，将实现和证据汇入正式 Investigation。

## Verification

- [x] 2.1 Bun 1.3.14 目标行为 61/61、21 文件通过，覆盖 hard guards、context/prefix、failure/drain 和 Invocation 生命周期。
- [x] 2.2 工程、入口和依赖检查通过；三个生产模块与已测候选的类型擦除 JS AST/叶 token 等价。
- [x] 2.3 完整 Case 704/176/15 和材料通过；同 candidate required 34 pass / 9 NA、complete 43/43 通过，含 artifact/installed consumer。
- [x] 2.4 独立审查并交接实测收益、剩余 N 扫描、未覆盖负载和临时快照隔离边界；保留 Gate 非阻断告警。
