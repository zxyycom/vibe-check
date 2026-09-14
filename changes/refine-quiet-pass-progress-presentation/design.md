# Design

本设计是 quiet-pass progress presentation 的实施契约：以 normalized Check presentation fact 为唯一事实源，将 authoring、private lifecycle handoff、renderer 行策略、文档和验证闭合到同一 Outcome。

## Context

- **Quiet pass**：Check outcome 为 `passed`，且 settlement 接受的 Records 与 messages 均为空。passed final data 不是 progress detail；preview count、formatter 文本与终端截断只影响呈现内容，不改变 accepted facts。
- 当前 `visibility: "attention"` 省略 quiet pass 的 settled block，但 TTY running row 与普通 Check 共用 `[n/total]`。`totalChecks` 和 completion count 已包含所有 executable Checks。
- progress `prepared` feedback 当前只有 `totalChecks`，`started` feedback 只有 identity，`settled` feedback 才携带 visibility 和终态 detail。normalized Definition 在 Run 开始前已经具备计算 configured count 和向 start handoff 策略的全部事实。
- TTY 使用可重绘的 running region；plain output 与 `TERM=dumb` 只追加 settled presentation。本 Change 不建立第二套 live/results 模型。
- active/unaligned Decision `260914-configure-progress-previews-and-quiet-pass-presentation` 完整保留已对齐的 preview、formatter、安全与 failure 边界，并以本 Plan 的字段和 row policy 修订旧 attention 行为。
- package 的公开兼容承诺明确不保证 `0.0.x` patch 间 package-level compatibility，且仓库内所有 `visibility` 用法可在同一 Change 原子迁移。保留 alias 会让同一行为拥有两个入口，却没有独立消费者需求。

## Goals / Non-Goals

**Goals**

- 让 Check author 从字段名和单一 opt-in value 直接预估 quiet-pass row 的效果。
- 让 policy-enabled Check 在 TTY 运行期间持续可见，并使其 running 与 retained settled rows 一致地不参与 `[n/total]` 编号呈现。
- 分别报告 Definition 的 configured count 与本次 Run 的 actual omitted count，同时保持普通 row 的全局 progress accounting。
- 保持完整 Check lifecycle facts、默认输出、TTY/plain/dumb、tee、escaping、preview 和 writer-failure 边界。

**Non-Goals**

- 不从 dependency、handoff、resource claim、display name、callback 内容或 Check 角色推断 presentation policy。
- 不增加名称清单、verbose mode、交互折叠、宽度感知、non-TTY heartbeat、public progress event 或 RunResult/machine readback。
- 不改变 flag-condition-not-matched 分组、Check selection、execution、settlement、aggregation membership 或 machine schema。
- 不为未来假想的第三种 row policy 建立 enum，不为旧 `visibility` 建立 alias、warning 或兼容期。

## Decisions

### Intended Change

1. **Public grammar 使用单向效果字段。** executable Check 增加 `readonly omitQuietPassedRow?: true`，删除 `visibility` 与内部 `CheckVisibility`。closed runtime parser 接受 absent、own `undefined` 或 `true`；前两者规范化为 `false`，`true` 规范化为 `true`，container declaration、`false`、旧字段和其它值失败。该字段不继承给 children。

2. **Normalized boolean 是唯一策略事实。** `NormalizedCheckDeclaration` 与 declarative snapshot 始终保存 `omitQuietPassedRow: boolean`；默认 `false` 与显式 authoring omission 具有相同 fingerprint，`true` 与它不同。执行、facts、machine output 和 public RunResult 不复制这项 presentation policy。

3. **Private feedback 在需要策略的最早位置携带事实。** Run 以全部 normalized executable Checks 计算 `quietPassOmissionConfiguredCount` 并随 `prepared` feedback 交给 renderer；`started` 与 `settled` feedback 都携带当前 Check 的 normalized boolean。renderer 不回查 Definition，也不从 settled outcome 推断 authoring intent。

4. **Policy-enabled rows 始终无编号。** 除既有 flag-condition-not-matched 聚合块外，renderer 使用下表。无编号 row 仍使用相同 indentation、escaped display name、status、duration、reason、Records/messages preview 与 color pipeline。

   | Normalized policy 与 Check 状态 | TTY running row | Settled presentation | Omitted count |
   | --- | --- | --- | --- |
   | `false`，任意状态 | 既有 `[n/total]` row | 既有 `[n/total]` block | 不增加 |
   | `true`，quiet pass | `  · <name> \| running[ \| <elapsed>]` | 省略 | 增加 1 |
   | `true`，passed 且有 accepted Record/message | 同上 | `  · <name> \| passed \| <duration>`，保留 detail | 不增加 |
   | `true`，failed / not-applicable / unavailable | 同上（实际启动时） | `  · <name> \| <status> \| <duration-or-not-run>[ \| <reason>]` | 不增加 |

5. **Quiet-pass 判定发生在 preview pipeline 之前。** 判定只读取 settlement 的 outcome、完整 accepted Records 和 accepted messages。`recordPreviewLimit: 0`、`messagePreviewLimit: 0`、formatter 返回空字符串、detail 被数量限制或文本截断都不把已有 detail 的 pass 变成 quiet pass；final data 始终不阻止省略。

6. **普通编号继续表示全局 accounting。** renderer 对每个 settlement 递增唯一 completion counter，包括 quiet pass 与 flag mismatch。普通 running/settled row 继续使用该 counter 和完整 `totalChecks`，所以 retained rows 的编号允许跳跃；policy-enabled row 不临时加入编号系列，也不在失败时改回编号格式。

7. **配置数与结果数使用不同文案。** 当 configured count 为零时，header/final bytes 不变。当其大于零时：

   ```text
   Vibe Check
   total 12 checks · 3 configured for quiet-pass omission

   Checks:
   ```

   final summary 在现有 `elapsed` 前增加：

   ```text
     quiet-pass rows omitted: 2
   ```

   configured count 是全部 normalized executable Checks 中 policy 为 `true` 的数量，包括本次因 flags 未匹配而未启动的 Checks；actual count 仅在 renderer 确实省略 policy-enabled quiet pass 时增加。flag mismatch 聚合块、writer failure 前未完成的潜在省略与任何 retained row 都不增加 actual count。

8. **旧 grammar 直接退出。** 在同一实施中迁移 package Checks、docs examples、API projection source、machine example Definition 与 external-consumer fixtures；runtime closed grammar 对 `visibility` 报 unknown key，TypeScript declarations 不再提供该字段。当前 `0.0.x` 政策不要求 alias；下一次 release changelog 负责按实际净 diff 说明升级。

### Resulting Impacts

- `check-fields-authoring` 的 key set、executable/container validation、tree resolution/materialization、normalized declaration 和 fingerprint tests 都要围绕 `omitQuietPassedRow` 更新；测试需区分 TypeScript literal opt-in 与 runtime own-`undefined` compatibility。
- execution identity/lifecycle 与 progress feedback 类型需要交付 normalized policy；`prepared(totalChecks)` 需要同时交付 configured count。inert/disabled progress 继续不创建 writer、schedule 或 renderer。
- renderer formatting 需要抽出 indexed 与 unnumbered row 路径，并在 settlement 时先处理 flag grouping、再执行 quiet-pass omission、最后处理 retained row；completion count 无条件推进，omitted count 只在第二步推进。
- final formatting 需要读取 configured/actual counts，且零配置时不改变当前 bytes。terminal 与 progress tee 继续消费同一 rendered bytes；任一 writer/formatter failure 仍沿既有 output-failure containment 停止后续写入。
- `maintenanceReminders`、两个随包示例、installed consumer 类型/runtime fixture 及 source JSDoc 要迁移字段；generated API/doc projections 必须从 owner source 重建而非手改派生内容。
- Test Evidence 中 visibility/attention 命名的 entity 与 `Proves` 要改成当前 quiet-pass policy；测试重命名、拆分或合并只在独立证明义务变化时进行，不为机械替换制造重复 Case。
- active/unaligned Decision `260914-configure-progress-previews-and-quiet-pass-presentation` 已记录 direct opt-in、无 alias、accepted-fact predicate、unnumbered rows 和双计数边界；实现、owner 文档和完整证据闭合后才标记 aligned。

## Risks / Trade-offs

- 普通 `[n/total]` 仍会因无 retained row 的 settlement 出现跳号；header/final counts 和用户指南必须明确这是全局 progress accounting，而不是 retained-row ID。
- `omitQuietPassedRow` 直接表达主要 outcome，但无编号 retained row 是实现该 outcome 时的配套 presentation contract；JSDoc 和指南必须同时说明，不能只写“通过时隐藏”。
- 单向 literal 字段不接受调用方直接传入普通 boolean。它换取 closed legal state 和清晰 opt-in；需要条件启用时，调用方应通过对象组合省略或加入字段，而不是传 `false`。
- 直接删除 `visibility` 会要求现有 `0.0.x` consumer 迁移。当前兼容政策允许该选择；保留双入口的长期认知和 validation 成本高于本轮一次性迁移成本。
- configured count 包含 flag-disabled Check，而 actual count 不包含它们；文案与测试必须使用 `configured`/`omitted`，不能用同一个“quiet checks”数量暗示二者相等。

## Open Questions

无。若实施中出现会改变 public grammar、quiet-pass predicate、计数集合、exact text、默认 bytes、owner 边界或成功标准的新事实，先重新审阅并同步 Plan 的 proposal、design 与 tasks；普通局部实现选择不重新打开产品决策。
