# Tasks

先用报告化接入调查解除后端门禁，再完整迁移收集与共同 matcher；实施、非实施代理独立正确性复核及最终优化和验证已完成，验收快照待协调者提交。不以计划状态代替运行证据。

## Readiness

- [x] 0.1 范围与 owner 自审：核对 proposal/design、文件范围 Decision、当前收集公开/内部 owner、既有调查的证据边界与协调入口，保留当前实现与未来方向的区别。
- [x] 0.2 契约自审：确认纯磁盘普通文件/no-follow/零 Git 与 ignore 策略、patterns 完整列表、默认数组开关不可绕过、同步冻结/明确失败、Check 内共享及 Run/Check 责任保留。
- [x] 0.3 按 Design 发布后端接入 Readiness Investigation：在最低 Node 和记录版本的 Bun 验证 task base/静态 pattern/root 与 symlink/ENOENT/必要失败、共同 matcher/默认排除/混合剪枝；核定后端及版本，失败不弱化契约。
- [x] 0.4 在报告中闭合迁移与共享 Git helper owner 清单、固定默认数组与精确匹配参数、同一 filesystem workload/成本方法和支持宿主安装后验收入口，同步 design/tasks，未满足前不进入完整迁移。
- [x] 0.5 由非实施代理独立审查实际文档 diff，确认 Plan 第一项调查、产物、成功/失败处理与下游门禁可直接执行；自审不替代该项。

## Implementation

- [x] 1.1 在 0.3/0.4/0.5 完成后接入纯磁盘同步枚举与薄适配，保持 no-follow、root 校验、可信必要失败及全部 selections 无需求才剪枝，混合开关不误剪。
- [x] 1.2 一次迁移 selection types、closed descriptor-safe validators、默认值、constructors、Check/Gate 与 Run regions 为 patterns；collection/Run 使用同一完整 matcher/参数，拒绝 source/include/exclude，不保留旧 matcher 兼容。
- [x] 1.3 保持冻结/排序去重、Check 内必要共享、accepted/rejected、内容安全与 exact-input handoff；按清单移除收集专用 Git 接线并保留其它 owner 调用。
- [x] 1.4 用 pnpm 维护实际采用依赖、lockfile/许可/发布材料；同步指南、内部 owner、示例、changelog 和逐项配置迁移，按 test-evidence-review 维护测试/Case。

## Verification

- [x] 2.1 运行最窄 collection/public boundary tests，覆盖空 patterns/root、输入冻结/错误、必要失败/范围外剪枝、目录消失、task base/静态 pattern、普通文件与各类 symlink。
- [x] 2.2 验证 omitted/true/false/非法开关、默认数组隔离、宽/窄/正负/重新包含规则、混合开关共享与独立结果；记录收集零 Git 及不同 Git 环境/ignore/子仓库的同磁盘一致性。
- [x] 2.3 运行 matcher/Run/各受影响 Check/Gate tests，证明完整正负列表/dot/brace/extglob 同语义同参数、旧字段拒绝、baseline/rename/delete/unavailable 与内容安全/exact inputs 不变。
- [x] 2.4 按报告完成同一 filesystem 的访问次数/耗时/内存比较与端到端 Check 证据；Git 到磁盘候选域变化独立迁移验收，不能以局部 trace 声称性能收益。
- [x] 2.5 运行 typecheck/lint/dependency、文档/Case、最低宿主安装后消费者及完整包 Gate；完成非实施代理复核与最终优化，交付可提交的验收快照。协调者随后保存稳定提交，Core/debug 实际继承后才解除实施依赖。

## 验收交接证据

- Investigation `261011-project-file-collection-readiness` 承接接入探针、helper owner 清单、同 filesystem 前后成本、真实最低 Node Run/JSON Check 与性能限制。
- locked Bun 1.3.14 下全部 Product 493 tests 曾通过；随后新增 Run 原生列表矩阵与路径身份 Case。独立审查发现的 `./` 候选拼写及 POSIX lossy-byte 两项 blocker 已定向修复，修复后非实施代理独立正确性复核通过（locked Bun 15 tests、最低 Node24.18 12 tests）；Case 账本 670 entities / 164 Cases 完整闭合。
- 最终优化后的 `bun run check -- --all`：43/43 passed（28.5s），candidate `0.0.0-local.a85ccc1794bf`，包含最低 Node24.18 exact tarball 的 types/runtime/docs consumer、typecheck/import boundary/lint/dependency、quality、材料与全部 test lanes。证据目录 `.log/project-gate/2026-10-11T10-04-29.175Z-1137729-b53be0d9-c0a0-4009-8755-9ac7df65a31c/`。本轮另行执行 locked Bun project-files 15/15、最低 Node collection/public/path-identity 12/12、validate、docs:api、Case、Investigation/Decision 与全 Change 检查，通过。
- 文档阅读恢复已核对三条路径：consumer 可恢复用户负规则与默认层的独立性；维护者可恢复候选 superset、完整 matcher 与两宿主 byte 身份边界；下游可从稳定 owner 恢复契约，并识别必须继承验收提交而非工作树/Readiness 的实施门禁。
- 2.5 按最终验证证据勾选。可提交验收快照尚未 add/commit；提交与 Change 结项由协调者执行，Core/debug 在实际继承稳定提交后才解除依赖。两条 Decision 保持未对齐，本优化阶段未 mark-aligned 或删除 Change。
