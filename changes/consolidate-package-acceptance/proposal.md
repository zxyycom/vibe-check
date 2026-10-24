# Proposal

将包/API 验收中的重复计算与完整产物负向测试收敛，保留真实消费者边界；本文是本次实施计划。

## Why

公开导出表在 source/runtime/declaration 重复建立 TypeScript 图，文档预期材料在同次 invocation 反复生成，Worker 负向矩阵还会修改共享 staging 并反复审计完整候选。它们增加执行与资源成本，也扩大故障注入的影响范围。

## Outcome

相同源码事实只做必要计算，负向测试隔离且可证伪，最终产物的精确公开面、物理材料、外部类型与 Node 执行仍完整验收，并有前后测量和完整 Gate 现场。

## Scope

### Intended Change

将 Worker 损坏矩阵改为最小 test-local fixture；以最终产物承接 exact export inventory，runtime 使用已有 Node consumer；复用同次文档预期材料，删除或 fixture 化真实仓库文档的重复正向自测。

### Resulting Impacts

同步内部候选材料传递、相关 Case 与 package owner 文档；审查跨进程输入身份与独立预期值，避免扩大机器输出或引入跨轮缓存。保留已有诊断改动。

## Success Criteria

- 不再为 Worker 负向矩阵改写共享候选，缺失、逃逸和重复 URL 仍失败。
- 精确 runtime/type export inventory 与原有有价值 JSDoc、安装隔离、类型和运行验收保留。
- 文档预期复用绑定同次源码/候选身份，不同载体比较和 Node 示例仍执行。
- 最窄测试、Case 闭合、编码/文档规范与工程验证完成；前后测量明确噪声，完整 Gate 不自动重试、不放宽预算。

## Affected Owners

Package artifact/candidate/external consumer、Project Gate 内部 typed material、package documentation collector、测试 Case、编码规范和文档导航验证入口。
