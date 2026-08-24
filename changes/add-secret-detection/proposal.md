# Proposal

本 Plan 保留 Product-owned secret detection Check 方向，但在首次公开发布后、detector质量和全 surface泄露证据可闭合时才恢复实施。

## Why

Secret scanning价值高，但错误实现会同时造成漏报、误报和二次泄露。旧计划把大量安全语义绑定到已退出的 Manager/TaskPlan、shared file policy与 Record catalog。当前 minimal Record/output不会验证敏感内容，detector必须自己保证 raw bytes、substring和 value-derived digest不越过 private invocation memory。

## Outcome

未来 Package 可提供 ordinary `secretDetection` Check：只读取 global scope内经 bounded text classification批准的 files，使用经过审计的高置信 detector，在 invocation-owned memory处理 raw values，只发布安全分类、project-relative location与 coverage counts；任何领域 finding/coverage gap和执行不可用都有明确四态语义。

## Scope

### Intended Change

- 恢复前选择并审计 detector rules/implementation、provenance/license、false-positive/false-negative corpus和 maintenance owner。
- Check-owned options固定 file/byte limits、closed rule selection与可选自身筛选；不得接受 arbitrary regex、command、message或 raw-value suppression。
- Bounded ordinary-text classification先于 detector；oversize/unknown text按明确 coverage policy结算，binary/non-text不误作 clean scanned input。
- Records/final data只包含 rule ID、safe structural identity、normalized source path、位置与 counts；不包含 raw match、prefix/suffix、entropy material或 value-derived digest。
- 不扫描 Git history、environment、home、remote secret manager或 binary，不验证credential有效性、不自动吊销/修复。
- 不纳入首次公开 release gate。

### Resulting Impacts

Detector、classification、coverage、identity、failure与所有 output/log/cache/temp surfaces必须用同一 synthetic canary证据闭合；不能用“后置清洗”补救 raw material传播。

## Success Criteria

- Synthetic high-confidence fixtures产生可定位 findings，而 stdout/stderr/progress/messages/RunResult/records/machine/cache/temp/log/error/stack均找不到 raw canary、substring或 value-derived digest。
- Detector rule corpus有可审阅 precision/recall期望，dependency/derived source与 license/provenance完整；无法证明时不实施。
- Global scope、byte limit、UTF-8/NUL/binary classification与 oversize coverage有边界测试；未扫描材料不会被报告为 clean。
- Record identity只使用 safe rule/structure/path/ordinal，移动 line或替换 secret value不会泄漏或不必要改变身份。
- 实施后的 public/package/docs/Case与 required/full Gate证据完整。

## Affected Owners

- `docs/configuration.md`：future Check-owned detector/options。
- `docs/scan-scope.md`：candidate、bounded text与 coverage boundary。
- `docs/quality-metrics.md`、`docs/output.md`：safe Records/final status与敏感数据排除。
- `src/checks/**`、`src/definition/**`、`src/index.ts`：future detector/Check/public surface。
- `docs/testing/cases/**`：detector corpus、coverage、identity、failure与 leak-canary evidence。
