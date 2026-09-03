# Proposal

本 Plan 增加 Product-owned、随包提供的 `secretDetection` ordinary Check；它只处理 Check 显式声明的文件范围，并以 private adapter 和通用 Finding waiver 对账控制敏感材料与误判。

## Why

Secret detection 能在已声明的项目文件中发现高置信 credential 泄露，但错误实现会同时造成漏报、误报和二次泄露。当前 minimal Record/output 不会替 producing Check 验证敏感内容，detector 也可能在内存结果中携带完整 source；owning Check 必须在调用 reporter、形成 terminal message 或返回 result 前完成安全投影。

项目已经提供通用 `reconcileFindingWaivers(...)`，能够在保留完整 Finding 证据的同时审计误报豁免。Secret Detection 应采用该项目通用机制，而不是让 detector 自带 suppression、按 warning 文本过滤，或在扫描前排除已知 Finding。

## Outcome

Package 提供 ordinary `secretDetection` Check：只读取其必填 `files` policy 形成的 exact selection，经 bounded text classification 后调用高置信 detector，在 invocation-owned memory 处理 raw values，并只发布安全分类、project-relative location、coverage counts 与 waiver audit；任何 actionable Finding、coverage gap 和执行不可用都有明确四态语义。

## Scope

### Intended Change

- 新增随包 `secretDetection(...)` constructor、固定 Check identity、provider-owned final-data parser、公开 options/result/Record/unavailable types、安全 messages 与独立 Check guide。
- `files` 是必填的 Check-owned `{ source, include, exclude }` policy；不提供隐式全仓库 fallback。Detector 只接收 owning Check 已选择并批准的 exact paths，不得从 project root、Git history、environment、home 或其它来源重新发现输入。
- 固定采用调查报告推荐的 Secretlint monorepo release `v13.0.5`：`@secretlint/core@13.0.5` 与 `@secretlint/secretlint-rule-privatekey@13.0.5` 的静态单 private-key rule creator；MIT license receipt、synthetic corpus、Bun/package candidate 与 installed consumer 已作为该生产依赖的验收材料。
- Check-owned options 固定 file/byte/resource limits、closed rule selection 与 `findingWaivers`；不得接受 arbitrary regex、arbitrary command、raw-value suppression 或 detector-native baseline。
- `findingWaivers` 在完整且已安全投影的 secret Finding 集合形成后复用 `reconcileFindingWaivers(...)`，只按 rule/path/structure/ordinal 等非秘密 identity 和非空 reason 对账；保留原 Finding，并发布 unused/overmatched audit。Waiver 不吞掉 coverage gap、execution failure 或 detector protocol failure。
- Bounded ordinary-text classification 先于 detector；oversize/unknown text 按明确 coverage policy 结算，binary/non-text 不误作 clean scanned input。
- 第三方 detector 可在 private invocation memory 中返回含 source/raw material 的对象；Check-local adapter 必须在该边界内立即投影 allowlisted rule ID、safe structural identity、normalized source path、位置与 ordinal，并丢弃第三方 result。Raw material 不得进入 stdout/stderr、progress、message、Record、final data、machine output、cache、temp、log、error 或 stack；不采用持久化后再删除作为补救。
- 不扫描 Git history、environment、home、remote secret manager 或 binary，不验证 credential 有效性、不自动吊销/修复，也不自动加入项目 Gate。

### Resulting Impacts

Detector、classification、exact-input acceptance、coverage、identity、waiver、failure 与所有 output/log/cache/temp surfaces 必须用同一 synthetic canary 证据闭合。Public package inventory、第三方许可证、README/Check guide、Cases、candidate 与 installed consumer 都增加第八项随包 Check；现有 Project Definition 不增加按 warning 文本或 Check ID 解释的全局 suppression registry。

## Success Criteria

- 只有 `secretDetection.files` 选择并批准的 exact paths 被读取和检测；缺失 `files` 被拒绝，detector 不能重新枚举 project root。Synthetic high-confidence fixtures 产生可定位 findings。
- `@secretlint/core`、选定 rule packages 与 rule IDs 的版本、source revision、license/provenance 和 representative precision/recall 期望可审阅；无法证明时不进入生产依赖。
- stdout/stderr/progress/messages/RunResult/records/machine/cache/temp/log/error/stack 均找不到 raw canary、定义明确的 meaningful substring 或已列举的 value-derived digest；第三方 raw result 从不越过 private adapter。
- File selection、byte limit、UTF-8/NUL/binary classification 与 oversize coverage 有边界测试；未扫描材料不会被报告为 clean。
- Finding identity 只使用 safe rule/structure/path/ordinal，移动 line 或替换 secret value 不会泄漏或不必要改变身份。
- `findingWaivers` 保留原 Finding 和 applied reason，unused/overmatched authoring 形成 audit，raw value/hash/message text 不能作为 waiver identity，waiver 不能掩盖 coverage 或执行不可用。
- 实施后的 public/package/docs/Case、required/full Gate 与 installed consumer 证据完整。

## Affected Owners

- `docs/checks/secret-detection.md`、`README.md`、`docs/configuration.md`：第八项随包 Check、必填 file selection、options、outcomes、waiver 与安全边界。
- `docs/scan-scope.md`：Check-owned exact selection、bounded text classification 与 coverage boundary。
- `docs/quality-metrics.md`、`docs/output.md`、`docs/api-mechanics.md`：safe Records/final status、Finding waiver 对账和敏感数据排除。
- `src/package-checks/secret-detection/**`、`src/package-checks/project-files/**`、`src/index.ts`：detector adapter、Check runtime 与 public surface。
- `scripts/package/**`、`scripts/docs/**`：public inventory、第三方许可证、package guide、candidate 与 installed consumer。
- `docs/testing/cases/**`：detector corpus、exact scope、coverage、identity、waiver、failure 与 leak-canary evidence。
