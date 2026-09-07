# Proposal

本 Plan 在不改变 Check contract 的前提下，收敛四个 Check guide 中确实相同的 files selector 与 Finding waiver 说明。

## Why

`duplicateDetection`、`fileMetrics`、`functionMetrics` 与 `secretDetection` 都让 consumer 写 `files` selection，并都采用 Finding waiver；现有指南重复说明相同的 selector grammar 与 reconciliation/audit 过程。重复文本提高维护成本，也让读者难以分辨共同规则与 Check-local policy。

此前 Draft 假设未来 public file tool guide 可能成为共同落点。当前用户批准的范围不包含该 tool；现有 package README 已是发布的共同入口，`finding-waivers` 已是发布的 reconciliation guide，因此无需新增 guide、inventory 或公开能力。

## Outcome

README 作为共享 files selector core 的 published owner，`finding-waivers` guide 作为 waiver reconciliation/audit 的 published owner；四个 Check guides 链接这些共同说明，同时完整保留各自的 default、identity、scope、rejection、结果与安全边界。parser/adapter/final-data parser 说明因无共同稳定契约而维持 local。

## Scope

### Intended Change

- 在现有 README 增加四个目标 Check 共用的 `source/include/exclude` selector grammar、source 行为和显式数组替换说明；不把它定义为全局配置或新的 public file tool。
- 扩充现有 `finding-waivers` guide，使完整 Finding 后的 reconciliation、`{ identity, reason }` authoring、canonical matching、unused/applied/overmatched audit 与 helper ownership 成为明确共同规则。
- 从四个 Check guides 删除仅重复共同 owner 的文本，改为链接；保留每个 Check 的 field placement/default、identity grammar、waivable scope、Record/message/status、rejection、failure 与安全语义。
- 将此 Change 从 Draft 收敛为 Plan，并记录 parser 保持 local 的事实性结论。

### Resulting Impacts

- README 与所有受影响 guide 的 package-relative links 必须闭合，且 package documentation validation 必须继续通过。
- 共同 selector 段不能覆盖 metrics 的 `codeAreas`，function 的 reader eligibility，或 secret 的 required authorization 和 coverage policy；这些继续在 owning guide。
- 共同 waiver 段不能替代每项 Check 对 identity、不可豁免事实、evidence 与 terminal result 的说明；这些继续在 owning guide。
- 不新增或修改 product API、runtime、tests、package material inventory、`project-files` internal owner、`scanner-dependencies` internal owner，亦不建立或等待 public file tool。

## Success Criteria

- 四个目标 guide 可从实际 package material 进入共同 files/waiver owner，并在本页恢复本 Check 独有 contract。
- README 和 `finding-waivers` 分别只承接已验证的共同规则；没有稳定共性的 parser 仍保持 local，且 Plan 记录理由。
- `bun run validate -- docs` 与 `bun run change-plan -- check changes/refine-check-guide-shared-contracts` 通过。

## Affected Owners

- package README：已发布 files selector common core。
- `docs/guides/finding-waivers.md`：已发布 waiver reconciliation/audit common core。
- `docs/checks/{duplicate-detection,file-metrics,function-metrics,secret-detection}.md`：各 Check 的 consumer-local contract。
- `changes/refine-check-guide-shared-contracts/**`：当前实施范围、任务和验证证据。
