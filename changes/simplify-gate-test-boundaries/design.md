# Design

将可观察证明留在最窄真实责任层，以私有配置控制测试规模，并显式区分日常、发布和手动验收。

## Context

前序实施及审查已保存为 `f998ed4c`、`82f83db7` 和 `9bf26715`；形成时的输入、前后测量及环境边界见[测量报告](../../docs/investigations/measure-gate-test-boundary-simplification.md)。

两版追加清理从 clean main `9bf26715` 开始，只修改测试及必要计划/Case；起点与完成后的全树 Case 均为 781 entities / 192 Cases / 16 topics。用户当前授权提交前文档/代码复核、必要提交及 hook 推送。当前验证和未完成项由 [tasks](tasks.md#evidence) 承接；更广泛性能修复与 Change 删除另行确定范围或授权。

## Goals / Non-Goals

目标为减少错误层级、无关输入和强制自动义务，同时保留产品及安装后真实边界；追加审查按当前规范收敛表达并保存版本。非目标为修改公开 API、移除四项质量扫描、放宽限额/性能预算、建立跨轮 fixture 缓存、优化泛型/调度器或发布 package。完整 Gate 的既有性能阻断如仍出现，保留并报告，不为了过线扩展本次功能范围。

## Decisions

### Intended Change

1. layout 保留文件扫描与 import policy 接线；负向策略矩阵尽量用内存分析，删除组织形状和构建源码正则及其失去义务的测试。
2. package 路径约束直接调用路径逻辑；fingerprint 使用最小材料与私有工具链身份依赖；文档 guard 由真实调用方共享可直接调用入口，保留没有 fallback 的证明。
3. Git 分类/解析在逻辑层覆盖，真实 Git 保留代表边界；减少三次初始化，剩余真实用例仍使用独立 fixture，不新增共享缓存。异步顺序使用 barrier，时间计算复用已有可控时钟，真实 event-loop 边界仍有小集成测试。
4. function metrics 用同一生产读取路径和私有 limit policy 测小容量等于/超限、累计和 chunk 边界；生产默认仍 8/64 MiB。取消测试只用足够触发协议的一行输入，不让假 Worker 配大文本。
5. Gate 使用 routine/release-only/explicit-only 私有资格策略；复用 `--all --release-receipt` 发布上下文，不新增 Product API 或预算档。types 与 workbench 有显式 focused 诊断入口；常规 all/changed/fallback 不自动包含它们。现有 runner 分组不为性能拆分。
6. 追加审查以当前 owner 承接完整规则，其它页面保留任务路由；计划只保存当前状态和证据入口，形成时测量过程归调查报告。代码以编码规范的语义下限复核完整变化模块及直接消费者，仅修正实际职责、数据流或失败路径障碍。
7. Gate 规则矩阵直接调用性能领域 API，adapter 保留短路顺序、最终结果和真实日志代表证据；已有全集或真实 factory 接线承接重复证明。Markdown lint 的空 root、零匹配和 missing-root outcomes 由 Product 直接执行与真实文件系统证明。
8. duplicate acquisition 直接执行 Check，保留隔离进程、真实文件、scanner/cache 顺序、零额外获取与身份采样时点；area/blocking 矩阵由领域 API 证明，真实 scan/cache pair 验证 exact-input 交接与 raw-cache 策略重算。Git/安装 fixture 只保留被目标行为实际消费的输入。
9. Markdown collector 接收已渲染输入，类型配置直接测试既有函数，manifest 静态批准值在 source→projection/audit 层证明。真实 compiler、法律字节、文件排除、pack/installed 和公开 waiver 调用继续验收。

### Resulting Impacts

测试实体 rename/split/delete 依语义维护既有 Case；保留四扫描及 installed runtime/docs，公开签名不新增配置。稳定 owner 区分组织约定的 Manual CR 与机器依赖边界。Gate 分层和唯一 prepared candidate 的长期判断需要承接新的自动选择边界，发布完整性方向不变。Gate ID 改名会改变本地 learned-history identity，不迁移旧缓存或改历史 workbench 模型。

追加清理仅维护已有 Case 的实际证明范围；新配对领域测试沿既有 owner 放置，不创建生产测试 seam。真实 Git first-parent、当前 source/target 字节、installed Node/Worker、模块加载及退出证据保留。完整 Gate 串行执行一次作为交付验证，不将其耗时视为受控前后对照。

## Risks / Trade-offs

目录偏离不再自动阻断，types 兼容问题可能到发布前才发现，workbench 可到显式使用时才发现问题。测试接线必须真实消费新私有入口，避免只测 helper 而绕过 caller；fixture 复用不得引入顺序依赖。前后常规 Gate workload 因授权移出两项而变化，必须与局部测试优化分开量化。

## Open Questions

当前待确定的是完整 Gate 性能阻断的后续修复范围，任务 2.4 保持未完成；最近交付结果见 [tasks](tasks.md#当前验证与未完成项)。两版明确清理已通过独立审查，publication/结算等有独立证明责任的集成测试继续保留。

前轮 timeout 的现场见[交付超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)。后续单次通过只能证明该次执行成功，根因与稳定性仍待验证；本次提交不扩为新的生产测试接口、性能修复或 Change 删除。

## Implementation Observations

真实 timer/I/O 资格测试保留 8 MiB 逻辑输入，为实际 `setImmediate` 提供最多 256 次 chunk 让步窗口；断言读取在早期取消即停止。它不是容量上限测试。直接缩成 128/256 KiB 只剩 4/8 次让步，可能在真实回调得到调度前读完；本次不以阻塞 barrier 改变该资格测试，也不为消去数字添加生产 seam。生产容量边界、累计与取消协议的其它测试已缩小。
