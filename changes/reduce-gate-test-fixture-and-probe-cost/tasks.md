# Tasks

冻结同 workload 的 before，独立实施两项候选并保持证据目的，再集成验收。既有勾选对应 design 的前轮源；本轮重构与文档整理另行复验。

## Readiness

- [x] 0.1 核对 Gate/材料/测试 owner、原十步 probe、CLI Case 和起点完整账本。
- [x] 0.2 确认 child 隔离、Run 新鲜事实、真实 default CLI 与 focused adapter 的证据边界。
- [x] 0.3 独占窗口取得目标文件 before 样本，完成独立方案核查。

## Implementation

- [x] 1.1 单个隔离 child 驱动原 probe sequence，保持全部独立断言、局部计数和 cleanup。
- [x] 1.2 将 focused routing 绑定真实 main 共用的内部 adapter，保留 default/retired/failure/exit 证据。
- [x] 1.3 更新必要 owner 与 Case，保留原 Check 粒度、预算和测试门槛。

## Verification

- [x] 2.1 运行目标测试，核对 mock 隔离、module 复用、所有十步场景和 CLI 分支。
- [x] 2.2 固定 Product 输入成对复测完整旧/新 probe 的启动次数、工作量和 wall/CPU，记录 whole-file after 未完成及残余 corpus 成本。
- [x] 2.3 运行类型/lint/格式/函数指标、Case 和材料/计划检查。
- [x] 2.4 非实施代理反查实际 diff、Case 连续性与收益声明，修复实质问题。
- [x] 2.5 稳定组合输入运行 required/complete Gate，如实记录 deadline 或其它未解决边界。
- [x] 2.6 本轮语义保持重构与文档整理后，重新冻结组合输入、完成独立反查和受影响验证，记录新源身份；历史计时与 deadline 风险保留。
