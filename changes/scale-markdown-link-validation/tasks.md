# Tasks

审计项记录已完成的设计核对；实施从 1.1 开始，基线、代码、测试和验收按实际结果推进。

## Readiness

- [x] 0.1 核对公开/内部 owner、options 物化、source reader、resolver、final-data parser 和现有 Case 入口；确认逐引用探测及现有计数关系。
- [x] 0.2 审计节点身份、源/目标角色、观察固定、阶段化首错、完整发布及协作让步；推演重复边、循环、外部路径、缺失与取消分支。
  推演结果：两条跨文档引用共用一次目标观察、`targetReadCount=2`；选中源互引复用源事实；外部 report 分支不做目标 I/O。
- [x] 0.3 固定 `number | false`、默认值保留、Gate 关闭总量预算及节点批次预检；识别旧 Decision 的冲突并将演进设为产品修改前置。
- [x] 0.4 审计测量入口、before 可执行输入、操作量硬门禁、计时观察与交付命令；确认剩余任务有明确输入、产物及验证出口。

## Implementation

- [ ] 1.1 按 Design 协议建立专用测试支持测量器与 fixture，冻结 before bundle/identity/manifest 并采样；在此之前保持产品运行时源码不变。
- [ ] 1.2 演进相关 Markdown cache/Gate 长期决策，保留解析缓存配置与提醒承诺，记录图观察及预算新方向为 unaligned；完成后再修改产品。
- [ ] 1.3 实现私有节点/边/派生需求和完整 source 阶段，保留分类、source selection 与 occurrence 计数；不引入跨 Check 或 Core 图层。
- [ ] 1.4 按首次引用调度节点观察，复用源事实，处理授权、类型化需求、缺失及失败；实现两项总量预算的 authoring/resolved 校验和读前批次预检。
- [ ] 1.5 实现逐边结算、稳定诊断、阶段化首错和实际事件循环让步，保持取消与普通 Records 的完整发布边界。
- [ ] 1.6 更新 Gate options、公开类型/JSDoc、指南、内部 owner、消费验收与相邻测试；按测试证据规则同步 Case。
- [ ] 1.7 冻结 after 并运行相同测量协议，保存原始样本及结构/耗时/资源对照；对预算关闭的超上限执行单独验收。

## Verification

- [ ] 2.1 运行 `bun run test -- product`，证明图、观察、预算、计数、别名、循环、失败顺序及 timer/I/O 取消契约；新增测试以正确行为 owner 建 Case。
- [ ] 2.2 运行 `bun run typecheck -- product`、`bun run lint -- product`；确认公开 options 的关闭语法、默认值与非法输入边界。
- [ ] 2.3 运行 `bun run validate`、`bun run docs:api`、`bun run test-evidence -- check --root .`、`bun run decisions -- check` 和目标 Change 检查。
- [ ] 2.4 由非实施代理基于实际代码 diff 反查公开与内部文档；仅持随包指南验证预算配置、节点观察、首错与取消的使用理解。
- [ ] 2.5 核对测量 manifest、同输入配对与操作量硬门禁，说明全部重要场景的耗时/RSS 代价；运行 `bun run check -- --all`，包含 exact candidate、Gate 及 external-consumer 验收。
- [ ] 2.6 核对成功标准与长期 owner 交接后，按事实更新 Decision alignment；保留未完成任务，不以预算变更代替图式重构验收。
