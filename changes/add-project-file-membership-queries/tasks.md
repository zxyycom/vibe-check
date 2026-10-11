# Tasks

先完成 API/消费与重建 Readiness 调查，再继承完整 matcher 迁移进行 Core 接线与验收；勾选只说明所列证据实际完成。

## Readiness

- [x] 0.1 范围与 owner 自审：核对 proposal/design、两条 active Decision、Architecture、当前收集指南、Project files 和协调入口，区分未来 Core 方向与当前实现。
- [x] 0.2 契约自审：确认多来源值数据、双向定位、实际成员保留筛选、追加合并后重建/新旧视图隔离、无 I/O 和函数指标非强制迁移；临时输入不构成独立试算功能。
- [ ] 0.3 按 Design 发布 API/消费与重建 Readiness Investigation：确定精确签名、路径/身份/错误校验、未知键、私有存储、最小消费清单和重建 workload，同步 design/tasks；失败按报告保留门禁。
- [x] 0.4 由非实施代理独立审查实际文档 diff，确认 Plan 可恢复范围、依赖、调查失败处理和验收边界；自审不替代该项。
- [ ] 0.5 规则实施前，记录并确认实施基线继承收集 Change 已验收的完整 matcher 迁移稳定提交，无旧 matcher 兼容。

## Implementation

- [ ] 1.1 在 0.3/0.4 完成后实现公共 Core 值数据入口、批量合并与私有双向索引，封闭输入/结果修改通道，明确未知键与已知空结果。
- [ ] 1.2 实现显式追加值来源、合并后重建、新只读视图与旧视图不变；已知实际成员不被新增路径扩大，不调用来源获取。
- [ ] 1.3 在 0.5 完成后接入共同完整 patterns matcher；按 Readiness 清单迁移必要内部消费，保持 accepted/rejected、exact inputs、阈值与 policy。
- [ ] 1.4 同步 root exports、声明/JSDoc、README 入口、受管示例、实际消费 owner 与 changelog；按 test-evidence-review 维护受影响测试/Case。

## Verification

- [ ] 2.1 运行最窄 Core/实际消费测试，覆盖双向一致、零/多命中、空/未知键、路径/ID/非法输入及运行时修改隔离；显式不存在或已删除路径无 I/O。
- [ ] 2.2 验证批量与逐次追加等价、新文件/旧规则和新规则/旧文件重建、实际成员筛选、旧视图稳定；构造/查询/重建不执行 I/O 或刷新。
- [ ] 2.3 验证 collection/Core/Run 完整列表与参数一致及默认排除不删显式输入，消费策略不变；按报告测量代表性构造/查询/重建耗时与内存，记录结果/边界。
- [ ] 2.4 运行 typecheck/lint/dependency、文档/Case、支持宿主安装后消费者与对应跨边界/包 Gate；独立反查公开承诺及内部 owner，完整验收后才交付稳定提交给 debug。
