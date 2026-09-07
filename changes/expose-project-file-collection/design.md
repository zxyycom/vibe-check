# Design

本 Draft 以“仅共同复用文件收集、而非共同拥有 Check 领域模型”为方向，先收敛公共边界再决定是否实施。

## Context

**已确认事实**

- `src/index.ts` 已公开默认 selection 及其三个类型；内部 collection 同步收集，单 selection 返回数组，批量接口接收命名 selections 并返回 `ReadonlyMap`。
- collection 以 selection 的 source/include/exclude 收集和稳定过滤候选；内部调用者已在 typed-trust 边界内传入 resolved selection。
- `codeAreas` 与各领域的阈值、overlap 合并、duplicate comparison 仍由各 Check 拥有，不能借公共 file tool 统一为领域模型。
- `docs/development/project-files.md`、相关 types 与 collection tests 是当前稳定事实 owner。

**暂定建议**：先从 consumer 需要的“收集已验证 selection 的 project-relative paths”定义能力，不反向从内部函数签名推导 public API。

## Goals / Non-Goals

**Goals**

- 判断是否存在独立于某个 Check 的 consumer outcome，并确定单 selection、命名批量或两者中最小必要的公共表面。
- 明确 public `unknown` validation、同步 I/O failure、取消边界、路径排序/去重、返回值及嵌套数据冻结或复制的 contract。
- 使公共 collection 与 Check-owned exact-input、area policy 和领域语义可清楚区分。

**Non-Goals**

- 本 Draft 不改变 `codeAreas`、阈值、overlap 或 duplicate comparison 规则，也不建立共享领域模型。
- 不预设把当前同步 collection 改为异步，也不预设 cache、watcher、网络或文件内容读取能力；同步/异步及其与 cancellation 的关系仍待依据 consumer outcome 决定。不因公开工具改变当前 Check 默认值或 scanner ownership。
- 不在 API 方案确认前修改 `src/index.ts`、runtime、声明、README、tool guide 或 installed consumer。

## Decisions

### Intended Change

**暂定建议**：进入 Plan 前比较以下两个显式候选，而不是预设“export 内部函数”足够：

1. 公开一个只收集单份 validated selection 的工具；批量去重枚举继续作为 private optimization。
2. 同时公开以稳定命名输入、冻结/不可变输出表达批量收集的工具；其 key grammar、Map 观察语义与缺失/重复行为必须独立定义。

无论候选为何，public boundary 必须自己拒绝 unknown/hostile input，不能把内部 typed-trust 当成 validation。工具名、参数位置、source failure 表示、abort/cancellation 支持与 return snapshot 的精确语义均为待决，不得沿用内部名称或类型作为既定契约。

### Resulting Impacts

- 若公开能力获批：同步 package-root export、public type/declaration inventory、closed validation、immutability、collection I/O failure 与 cancellation tests；更新 project-files owner、README/tool guide，并以 installed consumer 验证真实使用。
- 若仅 public single entry：保留批量枚举共享作为 private implementation，不承诺 `ReadonlyMap`、命名 key 或跨 selection collection optimization。
- 若没有独立 consumer outcome：记录“不公开”，继续让 collection 只服务 Check internals；这同样是本 Draft 的有效结论。
- 任何方案都必须保留 Check 自身对 exact input、unsupported input 和领域结果的责任，避免 public tool 被解释成统一 policy layer。

## Risks / Trade-offs

公开过宽的 batch、source 或 selection 表面会把 filesystem/git behavior、同步阻塞 I/O、cancellation 与 package compatibility 锁定；只公开 single entry 可能不足以满足真实批量 consumer。直接返回可变数组或可再变的 Map/values 会使 snapshot contract 不可靠。严格 unknown validation 与不读取文件内容的边界可降低误用，但必须在 docs 与 installed consumer 中可恢复。

**验证建议（尚未执行）**：在方案确认后新增 API/validation/collection tests，运行最窄目标测试、public declaration/inventory 与 installed-consumer acceptance；文档更新后运行 docs checks 和 diff check。前轮 Gate 36/36 只证明前轮改动，不证明本 Draft 的 future implementation。

## Open Questions

1. 真实 consumer 是否必须一次收集多份 named selection；若必须，names、重复、缺失和返回 `ReadonlyMap` 应如何定义？
2. public API 采用什么名称与参数形状，如何避免将 Check-owned `codeAreas` 误作 file tool 输入？
3. source/I/O failure 是同步 throw、结果对象还是两层 API 的责任；public 工具是否接受 `AbortSignal`，并在何处观察取消？
4. arrays、Map 及每个 value 的 immutability/identity contract 是什么，是否需要 defensive copy？
5. 哪些 README/tool guide 场景足以证明该能力有稳定 consumer value，而非仅替代内部复用？
