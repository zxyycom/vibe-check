# Design

将可观察证明留在最窄真实责任层，以私有配置控制测试规模，并显式区分日常、发布和手动验收。

## Context

用户于 2026-10-24 明确授权实施，要求 6.1sol 子代理承担主要工作。前测在任何本轮实现写入前完成，记录于 `.log/gate-test-boundary-before-20261024-Tz7JLO/`。实施后用户追加文档/代码复核及相关改动一并提交的授权，首版已保存为 `f998ed4c`；后续提交限于本次审查修正，保留无关工作，Change 删除仍需另行授权。

本轮前测完整 Gate 43 项功能通过、性能 exit 1：elapsed-to-initial 36.715 s，mean 2.276 s，P95 6.053 s。局部独立两轮 layout 2.941/2.320 s、package tooling 2.741/2.531 s、function metrics tests 2.247/2.574 s、Git/timer 0.893/1.124 s。共享容器压力和自然缓存不可忽略，不承诺固定加速倍率。

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

### Resulting Impacts

测试实体 rename/split/delete 依语义维护既有 Case；保留四扫描及 installed runtime/docs，公开签名不新增配置。稳定 owner 区分组织约定的 Manual CR 与机器依赖边界。Gate 分层和唯一 prepared candidate 的长期判断需要承接新的自动选择边界，发布完整性方向不变。Gate ID 改名会改变本地 learned-history identity，不迁移旧缓存或改历史 workbench 模型。

## Risks / Trade-offs

目录偏离不再自动阻断，types 兼容问题可能到发布前才发现，workbench 可到显式使用时才发现问题。测试接线必须真实消费新私有入口，避免只测 helper 而绕过 caller；fixture 复用不得引入顺序依赖。前后常规 Gate workload 因授权移出两项而变化，必须与局部测试优化分开量化。

## Open Questions

追加代码/文档审查已完成，但交付 Gate 尚未通过：changed 仍超性能预算，完整 all 出现 duplicate-detection 五秒测试超时。
后者的一次隔离通过未闭合稳定性或根因，见[交付超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)。
本次按授权保存审查修正与失败交接；进一步超时/性能修复需先确定范围，Change 删除另需明确授权。

## Implementation Observations

真实 timer/I/O 资格测试保留 8 MiB 逻辑输入，为实际 `setImmediate` 提供最多 256 次 chunk 让步窗口；断言读取在早期取消即停止。它不是容量上限测试。直接缩成 128/256 KiB 只剩 4/8 次让步，可能在真实回调得到调度前读完；本次不以阻塞 barrier 改变该资格测试，也不为消去数字添加生产 seam。生产容量边界、累计与取消协议的其它测试已缩小。
