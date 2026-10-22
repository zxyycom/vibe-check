# Tasks

先完成方案审计，再冻结实际基线、实现局部优化与会话，最后以安全、产物及同窗口性能证据验收。

## Readiness

- [x] 0.1 审计调查、当前实现、长期约束和受影响 owner：三项优化、Worker 运行前提、共享读链与产物影响均已进入 proposal/design；独立审阅确认范围可直接实施。
- [x] 0.2 审计私有 job、取消/首错优先序、baseline 获取和验收路径；共享 owner 仅在命中写入范围时串行，真实基线与测试工作由后续未勾选任务承接。

## Implementation

- [ ] 1.1 按 design 的性能验收先保全 exact baseline tarball、源码/工具链摘要；准备同量级与小规模语料、独占测量目录及 before 安装/预热脚本，确认 package build 串行窗口与 mise Node/Bun 版本。
- [ ] 1.2 在收集 owner 实现 operation-local policy/prefix 与完整路径纯 memo；保留 matcher 编译/短路、filesystem 顺序、错误和最终选择语义，新增最小直接回归。
- [ ] 1.3 实现 async/sync 共用的自适应容量规则，保留 no-follow、fstat、真实 EOF/max+1 和 close；覆盖共用 Markdown lint 读链，其默认调用仍为 async。
- [ ] 1.4 实现 mdlink 私有 Worker/协议/会话及同步 probe/read 驱动；共享纯路径判断、原子取消、单在途 job、故障恰一次结算与幂等 drain/exit。
- [ ] 1.5 显式接入 resolver/source/target，保留分域授权、source facts、批次计费与 checkpoint；按 design 优先序整合 Worker/cache finalize 和 execution 发布前的取消/错误收束。
- [ ] 1.6 完成 compiler roots、定点 URL normalization、fingerprint/material audit、repository-layout 规则及其 test/support/Case 同步；补 exact installed Node mdlink consumer，并保留 function-metrics Worker 验收。
- [ ] 1.7 同步实现 owner、必要的公开 Worker/I/O/取消说明和 JSDoc；完成实际测试实体的 Case 映射，按非实施审阅反馈闭合稳定 owner 的影响。

## Verification

- [ ] 2.1 直接核对源/目标/共用 lint 安全与语义：外部 ignore/report/validate、越界再入、40/41 hops、前缀替换、固定观察/缺失、预算/首错、cache 当前 bytes、fstat 非 regular/超限时零分配零 read、EOF/增长/缩小/短读及 1 MiB/公开上限边界。
- [ ] 2.2 验证正常、可捕获失败与协作取消的 close/drain/exit；construction/post/protocol/error/exit、重复消息、提前取消/空输入、finalize 重入和双 resolver 取消隔离；不以强杀替代 close，不发布部分普通结果。
- [ ] 2.3 跑共用收集全部相邻回归及消费者测试，核对 selected paths/排序、混合 policy/default/reinclude、必要失败与 filesystem 观察顺序；验证每 policy/prefix 纯计算复用及操作结束后失效。
- [ ] 2.4 以真实安装包在受支持 Node 与平台验证 Worker URL、运行/取消/退出及根 export 闭合；覆盖新 root 缺失/越界/形状漂移拒绝。未取得的实际平台证据记为 Manual CR 并保持待验收，不以路径模拟冒充。
- [ ] 2.5 按 design 执行 Node/Bun 深度 10/30/60 同窗口对照与小规模代价检查，核对工作量/申请量，报告保留慢值的简要统计及采用判断；收益证据不成立时回到设计审查。
- [ ] 2.6 跑最窄行为测试、product/scripts typecheck/lint/format、validate、Test Evidence、Change check 和 `bun run check -- --all`；独立复核语义/文档影响，清理独占临时材料后交接必要简要证据。
