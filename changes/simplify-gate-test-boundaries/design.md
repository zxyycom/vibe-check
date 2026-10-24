# Design

将可观察证明留在最窄真实责任层，以私有配置控制测试规模，并显式区分日常、发布和手动验收。

## Context

前五版已提交至 `29de254a`。第六版从 clean main 与 781 entities / 191 Cases 起点加固四处断言/接线证据，当前进行文档、编码规范复核与 Git 保存。验证、未完成项和历史依据集中在 [tasks](tasks.md#evidence)。

## Goals / Non-Goals

目标为用最小充分证据覆盖产品及安装后的真实边界，并按当前规范整理实现与说明。范围限于测试、fixture、Gate 选择和相应文档；公开 API、生产默认值、四项扫描、预算与统计口径保持不变。完整 Gate 的功能和性能分别验收，失败现场保留用于后续调查。

## Decisions

### Intended Change

| 责任 | 直接证明 | 保留的真实边界 |
| --- | --- | --- |
| Layout / 模块依赖 | 内存 AST 覆盖依赖方向和加载语法；目录形状与构建源码写法交给人工审查。 | 文件扫描、TypeScript resolution、symbol identity、alias、递归闭包及 no-emit 类型错误；Core nonliteral 与 strict-tool dynamic 各留工程接线。 |
| Controls / flags / aggregation | 既有 API 覆盖非法值、四种 flag 运算及默认/custom 聚合矩阵。 | Run 拒绝时 prepare/execute 零调用、代表性启用/禁用、依赖闭包与 observes、结果传播、错误清理及 publication；诊断文件 collision 与原字节保留。 |
| 取消 / prepared / history | 取消断言明确 execution phase；预取消以 callback 外部计数证明零调用；prepared barrier 跨 event-loop turn 观察 Invocation 仍 pending。 | barrier 在失败时也释放并等待 Invocation；真实 history 写失败观察 recording-unavailable，Check facts 与 aggregate 仍 passed。 |
| Markdown | collector 接收已渲染输入；MD052 adapter 精确断言三种引用及忽略形式的位置列表。 | 非首列 finding 到公开 Record 的转换；空 root、零匹配及 missing-root 由 Check 与真实文件系统证明。 |
| duplicate / waiver | acquisition 直接执行 Check，area/blocking 与完整 waiver 变体由领域/cache 测试证明。 | 默认 scanner、exact-input、零获取、身份采样、source mutation、warm raw-cache 策略重算与隔离进程；installed waiver 保留 finding→公开 identity→applied→machine Records。 |
| Package / 工具链 | 路径、类型配置和 manifest 静态批准值使用直接入口；生产 fingerprint 对 12 项隔离材料逐项改字节并验证恢复。 | 真实 compiler/API 版本与 AST、物理 bin、法律及 façade 字节、文件排除、pack/installed Node/Worker；嵌套 platform/API 使用 manifest-anchored resolution。 |
| Git / 容量 / 时间 | 分类与解析用领域输入；同一生产读取路径配私有 limit policy 覆盖等于/超限、累计与 chunk；无关等待用 barrier 或可控时钟。 | 独立 Git first-parent fixture、生产 8/64 MiB 默认限额及真实 timer/I/O 资格；fixture 只准备实际消费的输入。 |
| Gate | 性能规则使用领域矩阵，已有全集与真实 factory 测试承接分组/接线；按 routine/release-only/explicit-only 选择。 | adapter 短路顺序、最终结果及两类真实日志；唯一 candidate、四扫描、installed docs/runtime；正式 receipt+all 包含 types，types/workbench 保留 focused 入口。 |

文档在 owner 完整表达规则，在计划保存实施取舍与证据；代码按[编码规范](../../docs/development/coding-style.md)复核完整变化模块及直接消费者，测试与临时 fixture 使用相同标准。

第六版在既有实体内补强以下观察：

| 边界 | 断言与隔离方式 | 再降一层会失去的观察 |
| --- | --- | --- |
| I/O session | 会话外计数证明非法 source 请求创建零个 Worker。 | 请求校验先于 Worker 创建的实际顺序；factory 内抛错可能被生产 catch 捕获。 |
| Machine projection | 独立字面量核对完整 Check identity、displayName、outcome data/reason。 | trusted snapshot 到 machine 的字段传递。 |
| Publication validator | 合法含 NUL 的结构化身份对按序接受，反序精确拒绝。 | schema、ownership、identity/order 和 fingerprint 共同组成的完整集合边界。 |
| Installed assessment | 修改私有 fixture 的 installed README，断言 reinstall / installation-invalid，finally 恢复原字节。 | lifecycle 实际校验已安装材料的接线；直接材料 helper 只能证明比较规则。 |

### Resulting Impacts

1. 测试 rename/split/delete 按语义维护 Case；配对测试放在已有 owner，公开签名不增加测试配置。compiler parser 保留现有隔离矩阵，避免为测试制造生产入口。
2. 语法配对测试与真实工程闭包同属 `scriptsPackageToolsBoundary` lane；路径纳入边界 region、从 ordinary validation region 排除，并由 selection 路径矩阵验证原 fast 资格。
3. Gate 自动选择的长期判断由稳定 Decision 承接；当前断言加固保持 Check 身份、资格、预算、timeout 和 runner 分组。
4. 按受影响边界串行执行交付 Gate：本轮涉及物理 candidate 测试，显式运行 `package:candidate:integration` 并使用 routine all；不增加 routine test discovery 成员。耗时只表示本次验收，不作为受控性能对照。

## Risks / Trade-offs

- 领域矩阵与代表接线分别证明，减少了每个非法值、flag 运算、语法或特定 builtin 各自穿过整链的组合观察；二者通过不等同于保留全部端到端证明。
- 隔离工具链材料证明真实 resolver/hash 的字节敏感性，installed compiler/API 测试另证运行资格；预期值独立于生产计算，fixture 保持调用间隔离。
- 目录偏离由人工审查发现；types 兼容问题可能到发布前、workbench 问题可能到显式使用时才发现。前后常规 Gate workload 移出两项的收益须与局部执行优化分开量化。

## Open Questions

后续需确定 Gate 性能和冷 candidate 集成超时的修复范围；数值、失败现场及未验证边界见 [tasks](tasks.md#当前验证与未完成项)。当前授权覆盖复核、Git 保存与既有 hook 推送，Change 删除另行授权。

## Implementation Observations

真实 timer/I/O 资格测试保留 8 MiB 逻辑输入，为实际 `setImmediate` 提供最多 256 次 chunk 让步窗口，并断言早期取消后读取停止。该规模服务真实调度观察，容量上限、累计与取消协议另用小规模输入证明。进一步缩小会减少真实回调获得调度的机会；应先取得等价观察证据，再调整此规模。
