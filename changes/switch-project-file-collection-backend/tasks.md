# Tasks

先用报告化接入调查解除后端门禁，再完整迁移收集与共同 matcher；实施与验收未执行，不以计划状态代替运行证据。

## Readiness

- [x] 0.1 范围与 owner 自审：核对 proposal/design、文件范围 Decision、当前收集公开/内部 owner、既有调查的证据边界与协调入口，保留当前实现与未来方向的区别。
- [x] 0.2 契约自审：确认纯磁盘普通文件/no-follow/零 Git 与 ignore 策略、patterns 完整列表、默认数组开关不可绕过、同步冻结/明确失败、Check 内共享及 Run/Check 责任保留。
- [ ] 0.3 按 Design 发布后端接入 Readiness Investigation：在最低 Node 和记录版本的 Bun 验证 task base/静态 pattern/root 与 symlink/ENOENT/必要失败、共同 matcher/默认排除/混合剪枝；核定后端及版本，失败不弱化契约。
- [ ] 0.4 在报告中闭合迁移与共享 Git helper owner 清单、固定默认数组与精确匹配参数、同一 filesystem workload/成本方法和支持宿主安装后验收入口，同步 design/tasks，未满足前不进入完整迁移。
- [x] 0.5 由非实施代理独立审查实际文档 diff，确认 Plan 第一项调查、产物、成功/失败处理与下游门禁可直接执行；自审不替代该项。

## Implementation

- [ ] 1.1 在 0.3/0.4/0.5 完成后接入纯磁盘同步枚举与薄适配，保持 no-follow、root 校验、可信必要失败及全部 selections 无需求才剪枝，混合开关不误剪。
- [ ] 1.2 一次迁移 selection types、closed descriptor-safe validators、默认值、constructors、Check/Gate 与 Run regions 为 patterns；collection/Run 使用同一完整 matcher/参数，拒绝 source/include/exclude，不保留旧 matcher 兼容。
- [ ] 1.3 保持冻结/排序去重、Check 内必要共享、accepted/rejected、内容安全与 exact-input handoff；按清单移除收集专用 Git 接线并保留其它 owner 调用。
- [ ] 1.4 用 pnpm 维护实际采用依赖、lockfile/许可/发布材料；同步指南、内部 owner、示例、changelog 和逐项配置迁移，按 test-evidence-review 维护测试/Case。

## Verification

- [ ] 2.1 运行最窄 collection/public boundary tests，覆盖空 patterns/root、输入冻结/错误、必要失败/范围外剪枝、目录消失、task base/静态 pattern、普通文件与各类 symlink。
- [ ] 2.2 验证 omitted/true/false/非法开关、默认数组隔离、宽/窄/正负/重新包含规则、混合开关共享与独立结果；记录收集零 Git 及不同 Git 环境/ignore/子仓库的同磁盘一致性。
- [ ] 2.3 运行 matcher/Run/各受影响 Check/Gate tests，证明完整正负列表/dot/brace/extglob 同语义同参数、旧字段拒绝、baseline/rename/delete/unavailable 与内容安全/exact inputs 不变。
- [ ] 2.4 按报告完成同一 filesystem 的访问次数/耗时/内存比较与端到端 Check 证据；Git 到磁盘候选域变化独立迁移验收，不能以局部 trace 声称性能收益。
- [ ] 2.5 运行 typecheck/lint/dependency、文档/Case、最低宿主安装后消费者及对应跨边界/包 Gate；非实施代理反查材料，全部通过后才交付供 Core/debug 继承的完整迁移稳定提交。
