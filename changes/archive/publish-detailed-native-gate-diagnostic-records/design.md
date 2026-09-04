# Design

本设计将 native operation 的共同职责限于两件事：把 owner 已确认且已排序的安全诊断逐项写成 Record，并把同一集合有界地预览到终端。diagnostic 的语义始终由 docs、Decision Records、Test Evidence 或 ast-grep owner 负责。

## Context

- Product Record contract 是 Check-local `{ checkId, id, data }`。Records 是 supplemental facts，不决定 Check status 或 aggregate；machine v4 按 `{ checkId, id }` 排序并发布完整 Record set。
- 本 Plan 解决的是先前 native adapter 只保留 aggregate 的问题。四个 docs Checks、Decision Records 和 semantic Test Evidence 共用 native adapter；ast-grep rule-test Check 不共用它，但其 version mismatch 同样需要安全 Record。
- docs workflow 有五个 task name；native Gate 只绑定 `json`、`schema`、`examples` 与 `links`。`package-api-documentation` 属于 package/docs provider 和 external-consumer acceptance，不成为 native Gate diagnostic owner。
- links provider 需要保留所有 missing local-link occurrence，而不是把它们拼进 Error text。Test Evidence 的结构化 diagnostic 可能包含不可信的 process 或 parser text；Decision Records capability 也可能给出不安全的 string errors。
- native docs、Decision Records 与 Test Evidence operation 不创建 transcript。external-command Checks 与 ast-grep rule tests 各自拥有 artifact-directory transcript；它们的 Record 不复制 child output。
- 长期 Decision 约束本 Change 的方案选择。只有实现与验证均已成为事实后，才可 mark aligned；Change Plan 或 checkbox 不构成 alignment evidence。

## Goals / Non-Goals

- Goals：让每个 safe diagnostic 回到 invocation Record/readback；让人类输出可修复但受数量与单条长度限制；让 docs links 优先提供精确、可排序的 typed facts；完成同类 native Check 审计，不遗留 aggregate-only failure。
- Goals：让每个 owner 明确选择并测试 ID、data fields、safe presentation、sort key 和 unsafe/error fallback。Gate 不从字符串或 Record data 反推这些语义。
- Non-Goals：不定义 public diagnostic schema、Record registry、Record-to-message renderer 或 generic path/location type；不改变 package public exports、machine schema、normal quality Finding policy、scheduler/aggregate、Gate selection、duration display 或 invocation directory layout。
- Non-Goals：不让 native adapter 解析 external-process output，不发布 command stdout/stderr，不新增 native transcript；不改变 `package-api-documentation` 或 ordinary process nonzero failure 的 owner。

## Decisions

### Intended Change

1. **Private native operation common denominator.** `NativeOperationFailed` 带有非空、owner-sorted `diagnostics`。每项为 `{ id, data, presentation }`：`id` 是 stable Check-local identity；`data` 是完整 non-array safe Record object；`presentation` 是已批准的单行安全文本。adapter 为每项调用 `records.report({ id }, data)`，保留 Check-level failure code、focused command 和 diagnostic count，并且不从 `data` 提取、排序或格式化语义。

   adapter 的唯一 display policy 是：按输入顺序显示前 **10** 项；每项最多 **240 Unicode code points**。超长项标记 `truncated`；溢出项以准确 omitted count 指向同一 Check 的完整 Records。preview 只来自 `presentation`，不来自 exception、Record serialization 或 transcript。空、重复或不安全 diagnostics，以及 operation throw，均 fail closed 为 unavailable；不得伪造 aggregate failed Record。

2. **Docs workflow and four Gate task projections.** `scripts/validation/documentation/workflow.ts` 为可预期的 validation failure 提供 typed result/diagnostic boundary。task provider 构造已排序的安全 diagnostics；workflow 收集所选 task 的 expected diagnostics，仍只用 explicit reporter 发布 success。CLI 把每条 typed presentation 写到 stderr 后非零退出。unexpected I/O、programming 或 safety fault 继续 throw，并由 Gate 映射 unavailable；不能被 catch 成 generic failed summary。

   `links` 在一次扫描中保留每个缺失 local-link occurrence，并按 `{ sourcePath, line, column, occurrence }` 排序。其 data 至少为 `{ kind, sourcePath, targetPath, location: { line, column }, occurrence }`；source/target 都是 canonical repo-relative path。owner-local ID 从这些稳定定位字段形成，presentation 使用同一定位。json、schema 与 examples 分别定义自己的安全 ID/data/text，不使用共同的 `docs-*-invalid` count Record。

3. **Other native checks retain local semantics.** Decision Records adapter 将 capability 批准的 validation facts 排序并映射为 local identity/data/presentation；不改变 decision CLI lifecycle，也不解析第三方 process material。semantic Test Evidence adapter 只映射 blocking diagnostics，并按 code-specific policy 投影 owner 批准的 code/origin/path/location/Case data；可能包含 raw stdout/stderr 或 untrusted parser text 的 message 不进入 Record 或 preview。无法安全投影时结算 unavailable。ast-grep version mismatch 发布一条 expected version、fixed mismatch classification、version exit code 与 invocation-relative transcript reference 的 Record；不解析或复制 version stdout/stderr。rule-test nonzero 继续使用现有 `command-failure` helper。

4. **Evidence and owner materials.** Gate/native adapter、每个 provider 与 direct docs workflow 分别有 failure fixture。machine/readback/progress tests 由同一次 Run 证明：Records 完整，preview 有界，status/aggregate 不变。stable owner docs 和 Case Proves 只描述这些已证明的边界；测试实体或正文变化依 `test-evidence-review` 维护。只有全部 stable owner facts 与 full verification 成为当前事实后，才可 mark aligned。

### Resulting Impacts

- **Record lifetime and compatibility:** 同一 Check 内的 local ID 必须唯一，data 必须是 canonical JSON。machine set 可以增加 Records，但 v4 schema 与 generic data contract 不变。测试直接断言每个 owner 的 Record collection，不从 terminal preview 推断 machine order。
- **Presentation safety and size:** producer 负责 safe presentation；adapter 只限制视觉输出。Records 保留完整 safe fields；raw child output、absolute paths、credential URL、digest 和 untrusted exception/message 不能经此路径泄漏。preview 的数量和长度不影响 final data、status 或 aggregate。
- **Docs task behavior:** typed expected failure 取代 docs Gate 的 aggregate loss。root CLI 仍是默认可见入口；in-process workflow 未提供 reporter 时保持静默，因此 Product progress writer ownership 不变。
- **Test Evidence process boundary:** CLI 能打印的 semantic diagnostic 并不自动安全。mapping 必须审计 origin 和 provenance；external-command/transcript tests 继续证明它们自己的边界，不成为 native diagnostic Records。
- **Coordination:** 实现跨 scripts/validation、Gate checks、Decision Records adapter、Test Evidence adapter、ast-grep check、stable docs 与 Case evidence；这些内容在一个 Change 内按 owner 依赖顺序集成。独立的 progress-duration Change 不在本范围内。

## Risks / Trade-offs

- 若 shared adapter 拥有字段、按内容去重或格式化 Record data，就会制造虚假的 generic diagnostic schema。因此它只接收 owner 已完成的 projection，并要求 owner-local mapping tests。
- 任意 Error text 进入 Record 会向 machine consumers 和 progress log 暴露不可信信息。无法证明安全时，计划选择 redacted structural fact 或 unavailable；这可能比 focused CLI 提供更少细节。
- validation failure 时多个 Records 会增加 machine artifact 大小。这是完整证据的成本；terminal preview 限制噪声，而不抑制 Record facts。
- 四个 docs tasks 的内部错误 API 不同。只在外层 catch 仍会丢失 item structure 或混淆 unexpected fault；task-owned typed conversion 因而可能需要局部重构。

## Open Questions

无。实施与 final verification 只需再次核对每个 docs、Decision Records 与 Test Evidence field 的 safe provenance；任何无法证明安全的 field 都依本设计使用 redacted structural projection 或 unavailable，而不扩张输出授权。
