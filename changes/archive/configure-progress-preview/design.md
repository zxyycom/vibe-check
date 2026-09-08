# Design

使用既有 output 配置与 renderer 实现可配置 preview；同步 formatter 是文本变换能力，不接管事实、安全转义或写入。

## Context

2026-09-07 用户确认本轮包含 formatter，输入默认文本、类型与长度限制即可。实施前基线是 `a2a4220304cf0ba5597637e20ce1b6d398b8cf57`。

实施前基线的直接依据（当前实现与验证结果见 tasks）：

- `ProjectOutputs.progressRendering` 只有 `enabled`，`defineConfig` 补默认；`output-validation.ts` 对完整 Definition 输出使用 closed validation。
- `controls/outputs-override-validation.ts` 已解析 invocation-local output overrides；`outputs/configuration.ts` 以 RunControls 逐字段覆盖 Definition。
- `declarative-snapshot.ts` 当时将整个 Definition outputs 纳入 fingerprint；新增 callback 后不能继续直接引用它。
- `presentation.ts` → `renderer.ts` → `renderer-lifecycle.ts` → `renderer-formatting.ts` 已是 terminal presentation 唯一路径，末端固定 limits 为 5／240。
- `inherit` 属于 Check composition，不是 Project Definition output 继承；本 Change 不修改 Check inheritance。

已通过 [后继预览决策](../../../docs/decisions/configure-bounded-progress-previews-with-text-formatter.md) 修订固定 limits、无 formatter 和无 public option 的旧方向；实施与最终验收后已标记 active + aligned。已恢复并继续遵守[分离输出 owner](../../../docs/decisions/separate-settlement-run-progress-and-machine-owners.md)和 [Check-owned Finding 展示](../../../docs/decisions/provide-generic-bounded-finding-presentation.md)。

## Goals / Non-Goals

**Goals**：独立 count/text limits；同步、文本级 formatter；Definition 默认加 RunControls 覆盖；旧输入兼容；callback-free identity；安全、有界、不改写完整 facts 的输出。

**Non-Goals**：不改 Finding limit、排序、waiver/security policy、Check settlement、Record shape 或 machine facts；不提供原始数据 hook、async formatter、ANSI passthrough、字段 registry、console plugin system、总输出资源预算；不改变 Gate 默认配置、attention 或 flag grouping。

## Decisions

### Intended Change

在现有 `outputs.progressRendering` 中使用平坦配置，避免增加无必要的嵌套 merge 规则：

```ts
{
  enabled: true,
  recordPreviewLimit: 5,
  messagePreviewLimit: 5,
  textPreviewCodePointLimit: 240,
  formatter: null // 或 ProgressPreviewFormatter
}
```

formatter 的公开文本契约：

```ts
type ProgressPreviewFormatter = (context: Readonly<{
  kind: "record" | "message";
  text: string;
  maxCodePoints: number;
}>) => string;
```

#### 配置、默认与身份

- `recordPreviewLimit` 与 `messagePreviewLimit` 是非负安全整数，默认各 5。0 不显示该类 detail，但有输入时仍显示准确 omitted count；两类独立，不补位。
- `textPreviewCodePointLimit` 是正安全整数，默认 240；不另造无证据的 100／1000 硬上限。非法数字、未知字段或非函数/非 null formatter 在 author work 前返回 configuration result，disabled 时也验证。
- `defineConfig` 省略新字段时补默认；旧 direct Definition 的 `{ enabled }` 输入在类型与 runtime 上继续合法，由解析/normalization 形成完整 effective limits。冻结 invocation-local value，不回写 caller。
- Definition 和 RunControls 对同一展示 policy 使用同型字段：Product defaults → Definition → RunControls 的显式字段。override omission/undefined 不覆盖，0 是有效数量，formatter 的 `null` 显式清除 Definition callback。
- normalized Definition 的数值字段进入 declarative snapshot；formatter 只投影 `default`／`custom` 种类，绝不放入函数、source 或 closure。省略/显式默认等价，不同 custom callback identity 等价；RunControls 覆盖不改变 fingerprint。
- 新默认 declarative fields 会改变升级前后的旧 fingerprint，不承诺跨版本字符串保持不变；核对现有消费者并说明影响，不因此修改 learned 算法或另建兼容 identity。
- 保持 `RunResult.outputs.progressRendering` 的 `{ enabled, status }` 形状，不增加 preview 文本或 effective limits 的机器字段。

#### Formatter 与 renderer 责任

1. 在 settled block 的 count-selected preview 中，先 Records 后 messages，依既有顺序逐项调用；每项最多一次，不对 omitted rows、summary、running rows 或 TTY refresh 调用。
2. 输入是冻结的独立 context，只含 kind、text、effective maxCodePoints。text 为**未 escape、未截断**的默认 Record local ID 加 canonical JSON，或完整 message 正文；不传 raw Record/message 引用、code/level、Check callback context 或 writer。
3. formatter 同步返回替代正文。空字符串合法，仍计为一条 presented item；不能通过返回值改变 level、Record label、顺序或 omitted count。
4. renderer 对返回值统一 escape terminal controls，再按 Unicode code points 限制；现有 `… [truncated]` marker 计入预算。预算短于 marker 时仅显示其预算长度的前缀（预算 1 为 `…`），不切半 surrogate pair。无 formatter 使用原默认正文并保持既有输出字节。
5. text limit 只约束每条 preview 正文，不限制缩进、level label、换行、lifecycle row、overflow row 或 summary。code points 不等于 terminal columns/graphemes。
6. throw 或非字符串返回（包括 Promise/thenable）使 progress output failed；不静默回退默认，不修改 accepted facts/Check status，不把任意 exception text 发布到 preview。沿既有 failure containment 停止后续 terminal rendering，仍完成输出 close 与其它 owner 的终态职责。
7. 不等待 Promise/thenable。误返真实 Promise 时只使用可靠的 rejection observation 防止未处理 rejection；不读取/调用任意 thenable 的 `.then`。回调自行创建的 detached work、副作用或 host 资源使用不在 Product containment 保证内。
8. formatter 是 trusted caller code，不是 sandbox。它看到的完整 text 可能长于最终 preview，安全字段仍由 producing Check 决定；Product 不承诺拦截其独立 I/O、控制其执行时间或 redaction。

### Resulting Impacts

1. 新建并建立后继 Decision，只修订预览可配置方向；保留原 Native adapter safe projections、focused-command-only messages、private transcript 和 owner-local diagnostics 边界。实现与证据完整后才 aligned。
2. 在现有 output owner 统一 grammar/defaults，显式区分 authored/resolved/declarative values；不要将 formatter function 留在 snapshot，也不为了通过旧测试批量放宽不相关输出。
3. 把冻结 effective policy 接入现有 renderer controller 和纯 formatter；默认值由 output owner 承接，避免第二套 renderer 默认配置。
4. API mechanics 提供 Definition 与 RunControls 示例及真正的 formatter 文本变换用例；Project Run 与 human-output 更新对应契约，JSDoc/公开类型、示例和 installed declarations 同步。README 保留可发现入口。
5. 核对真实 Definition output schema/example 和 fingerprint 消费者；不因无新 machine 字段就假定所有材料无影响。Finding presenter、Core/machine facts 与旧 output priority 不变。

## Risks / Trade-offs

- 增加 preview 数量/预算或传完整默认 text 给 formatter 会增加 caller 可见信息，escaping 不是 secret redaction；完整 accepted facts 本已由调用方 readback 持有。
- 0 只关闭 detail，attention 仍按 accepted facts 决定是否展示 settled row，不把“无 detail”误判为空结果。
- 同步 callback 可阻塞主线程，合法超大 limits 也可能形成大块输出；本 Change 不承诺总 CPU/内存/output budget。
- formatter failure 沿现有失败策略停止 terminal rendering，而不是显示默认文本掩盖错误；完整事实和其它输出仍闭合。
- Definition callback projection 增加一种声明性种类，不将 formatter identity 误当作行为或缓存等价证明。

## Open Questions

用户已经确认 formatter 必须存在及文本级输入范围；没有继续实施所需的用户范围问题。技术边界按本设计落实，若实际消费者证明需要 raw data 或 async，再另行确认，不从本次授权推导扩展。

## Verification

实施前已运行现有默认配置、Record/message previews 与 writer failure 目标测试：3 pass；Test Evidence 起点 557 entities / 126 Cases / 15 topics。这些仅证明旧基线，不证明新配置或 formatter。

实施验证由 tasks 记录：输入兼容/default/override/fingerprint；count 与短 marker、unicode/control escape；formatter 次数/顺序/failure/Promise misuse；完整 facts、tee、disabled 和 failure priority；用户与内部说明的独立实际 diff 审查；完整 package/installed-consumer Gate。

**Fingerprint 消费者核对（实现前源码证据）**：`scripts/project/gate/runtime/performance-observation.ts` 只在 Definition fingerprint、profile 与 runtime 均匹配时复用固定 performance baseline；新身份不匹配时按现有分支返回 `no matching baseline`，本 Change 不重采或改写旧 baseline。`src/learned-critical-path/strategy.ts` 从 caller 的 `identityForTask` 与 model options 构造历史 identity；当前 Gate caller 仅投影 `gateStrategy: "v1"` 和 task ID，duration-model 的 `recording.ts` 也不使用 Definition fingerprint。所以本次 output identity 变化本身不要求迁移该现有 Gate history；任意外部 caller 是否另用 fingerprint 仍由 caller 决定，不作全体消费者兼容保证。
