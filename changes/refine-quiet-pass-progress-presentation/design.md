# Design

本设计为 quiet-pass 省略建立一条从 authoring 到 progress 输出的明确契约，并沿用现有 TTY running region 与 append-only settled writer。

## Context

- **Quiet pass**：Check outcome 为 `passed`，且没有 accepted Record 或 message；passed final data 不属于 progress detail。
- 当前 `visibility: "attention"` 省略 quiet pass 的 settled block，但它的 TTY running row 与普通 Check 共用 `[n/total]` 格式。
- `totalChecks` 与 completion count 包含全部 executable Checks；presentation 省略不改变 settlement、dependency、aggregation 或 machine facts。
- `prepared` feedback 目前只有总量，`started` feedback 没有 presentation policy，`settled` feedback 才携带 visibility 和终态明细。
- TTY 刷新 running region；plain output 与 `TERM=dumb` 只追加 settled presentation。本 Change 继续使用这两个既有写入模型。
- 当前 active/aligned Decision `260907-configure-bounded-progress-previews-with-text-formatter` 保留了现有 attention 行为。字段或呈现契约发生变化时，由 Decision 后继承接长期取舍；本 Draft 只记录当前 Change 的实施方向。

## Goals / Non-Goals

**Goals**

- 用可直接预估输出效果的 authoring 字段表达 quiet-pass 省略。
- 让启用策略的 Check 在运行中可见，并使它的 running 与 retained settled rows 使用一致的无编号格式。
- 在开始和结束输出中分别说明静态配置数量与实际省略数量。
- 保持完整 Check lifecycle facts 及现有 TTY、plain、tee 和 writer-failure 边界。

**Non-Goals**

- 展示策略只由 author 显式声明，不新增 Check 角色，也不从 dependency、handoff、resource claim、名称或 callback 内容推断。
- 输出继续采用现有 TTY running region 和 append-only 模型，不增加名称清单、verbose 模式、交互折叠、宽度感知或 non-TTY heartbeat。
- 不改变 flag-condition-not-matched 分组和 aggregation membership。

## Decisions

### Intended Change

下列行为方向已经确认；字段最终形状、兼容路径和输出文案仍在 Draft 中收敛。

1. **直接声明展示效果。** 当前字段候选为 `omitQuietPassedRow?: true`。省略或 `undefined` 使用默认编号行；显式 `true` 启用 quiet-pass 省略。公开名称不表达调用方无法从输出验证的领域角色。

2. **启用策略的 Check 始终使用无编号行。** 除既有 flag-condition-not-matched 分组外，同一规则覆盖 running 和所有可见 settled outcomes，失败时不会临时加入编号系列：

   | Check 状态 | TTY running row | Settled row |
   | --- | --- | --- |
   | quiet pass | 无编号、刷新 elapsed | 省略 |
   | passed 且有 Record/message | 无编号、刷新 elapsed | 无编号、保留 detail |
   | failed / not-applicable / unavailable | 无编号、刷新 elapsed | 无编号、保留状态与原因 |

3. **编号继续表达全局进度。** 普通行保留 `[n/total]`；`total` 是完整 executable Check 数量，`n` 随全部 settlement 推进，包括没有 retained row 的 quiet pass。它是输出时刻的 progress accounting，不是永久行 ID。

4. **配置计数与结果计数分开命名。** 开始输出报告启用策略的 Check 数量；结束输出报告本次实际省略的 quiet-pass row 数量。失败或带 detail 的 Check 属于前者但不属于后者。

5. **策略只进入人读输出链路。** Preparation 提供静态策略数量，started feedback 提供无编号 running row 所需的规范化策略，settled feedback 继续提供 outcome、duration、Records 与 messages。Renderer 拥有计数和文本；`RunResult`、machine schema、dependency activation 与 aggregation 继续包含所有 Checks。

预期的 TTY 片段如下，其中无编号行仍推动其它行的全局进度：

```text
Vibe Check
total 12 checks · 3 configured for quiet-pass omission

  [6/12] TypeScript lint | running | 3.2s
  · Prepare environment | running | 8.4s
```

`Prepare environment` quiet pass 后移除，下一次 redraw 可以显示 `[7/12]`；若它失败，则以无编号 settled row 保留。

### Resulting Impacts

- Check authoring type、runtime validation、normalization、declarative snapshot 与 fingerprint 需要围绕一个规范化策略事实源更新。
- Check execution 到 progress renderer 的 private feedback 需要在 start 前携带策略，并支持静态配置计数、无编号格式和实际省略计数。
- 公开 run-output/authoring 指南、内部 Human output/Project Definition owner、类型 JSDoc 与相关示例需要同步当前契约。
- Tests 需要覆盖 TTY redraw、plain/dumb output、quiet pass、带 detail 的 pass、三类非成功终态、final summary、tee、escaping 和 writer failure；测试修改按 test-evidence 流程审阅。
- 公开字段变化需要完成兼容判断并维护相关 Decision；行为交付按项目规则接受独立文档影响反查。

## Risks / Trade-offs

- quiet pass 会让普通 `[n/total]` 出现跳跃；如果用户仍把它理解为行号，字段改名和计数说明不足以解决体验问题。
- 开始时的 configured count 与结束时的 omitted count 可以不同，输出必须用不同名词表达 configuration 与 outcome。
- 直接字段最容易预估，但会固化当前唯一行为；可扩展 enum 增加未来空间，也增加本次无现实依据的抽象。
- 旧 `visibility` 与新字段若并存，会形成两个表达同一行为的入口；直接删除则产生 public compatibility 影响。

## Open Questions

- Public grammar 采用 `omitQuietPassedRow?: true` 还是 settled-row enum；旧 `visibility` 应直接移除还是提供有期限的兼容输入？
- 开始与结束输出采用什么精确文案；普通 `[n/total]` 是否需要显式标注为 progress accounting？
- formatter limit 为零、formatter 返回空文本和 accepted detail 被终端预览省略时，是否仍按 accepted Record/message 判定非 quiet pass？
