本临时且未审计的 tasks 清单目标是安排safe occurrence identity与blocking coverage的secret detection；唯一1.1未完成前禁止全部实现。

## 1. 阻塞级 artifact 与依赖审计

- [ ] 1.1 阻塞审计全部artifacts是否围绕“raw secret不进入fingerprint/持久边界，oversized coverage不能clean gate”；核对capability/check/observation/evidence catalogs与semanticRegistryFingerprint、`maximumFileBytes` inclusive `1..67108864`/neutral `1048576`、fixed 8192-byte prefix且oversized zero detector/full-content reads、prefix不能证明suffix text、file subject identity/path+metric semantic order、empty security evidence、coverage `actualBytes`/`maximumFileBytes` kind/required/order/identity/redaction、optional section absent/skipped且不补neutral、present complete、override不能构造absent base、enabled=false/skipped、requested无candidate/no-input、quick/full、safe occurrence rotation/new occurrence、专用allowlist、explicit-baseline-only且`regressions ⊆ changed`、completeness/gate/cache/output；逐字段对照`standardize-quality-capability-contract`与`add-file-policy-overrides`最终artifacts，确认feature只注册catalog、更新expected fingerprint/examples/fixtures而不改immutable machine v2 schema bytes；执行privacy/resource/coverage adversarial review；确认capability/spec目录一致、首句均标明临时未审计、无越界修改或未回答问题。此唯一项未勾选前不得执行第2节及以后任何任务。

## 2. 测试证据与合成安全基线

- [ ] 2.1 以 1.1 完成为前置，运行 pre-change `bun run test-evidence:check`，恢复 config、scan scope、scanner adapter、finding/channel/gate、machine output 与 fixture 的 owner Cases；记录需新增或扩展的 semantic Case，不建立第二套 inventory。
- [ ] 2.2 建立isolated synthetic-secret fixtures与detector doubles，先证明range endpoints、<=limit bounded full read、8192-byte prefix/NUL/definitive-invalid/trailing-incomplete-UTF8矩阵、oversized zero detector reads、extension-independent scan、coverage finding、generated/vendor exclusion、read failure、zero findings、rotation-stable与new-occurrence fingerprint；不读取host credentials。
- [ ] 2.3 建立 leak-canary harness，对success、acceptance、gate、dependency/execution/invalid-result failure的stdout、stderr、report、machine streams、raw/tmp/cache/logs做fake-secret及prefix/suffix absence断言，并先使未实现路径失败。

## 3. Config v2 secret policy

- [ ] 3.1 注册complete optional `checks.secrets` section、neutral contribution与single-active v2 migration；固定`maximumFileBytes` inclusive `1..67108864`和neutral/init `1048576`，证明file-backed absent保持skipped且不补neutral、present必须complete、enabled=false skipped，并拒绝common acceptance匹配`secret-detection`/`secret-scan-coverage`。
- [ ] 3.2 接入schema-bounded`enabled`/`maximumFileBytes` overrideable leaves与base-only allowlist，证明override只能patch selected base已声明section、不能从absent base构造、不能越界或恢复global scope，且current/baseline/fallback一致。
- [ ] 3.3 实现safe allowlist：reason + fingerprint/pathGlob，optional checkId/rule conjunctive narrowing；覆盖rotation复用、new occurrence隔离与coverage acceptance，拒绝value/regex/message/backend及check/rule-only broad match。

## 4. Exact inputs、fingerprint 与敏感内存边界

- [ ] 4.1 注册candidate selector与scanned/size-unscanned/non-text disposition；<=limit才bounded full read，oversized classifier最多读取fixed 8192-byte prefix且不据prefix证明suffix、detector zero reads；为size-unscanned产生`secret-scan-coverage`，read/classification failure返回execution failure。
- [ ] 4.2 实现只消费rule/path/all-spans-marker sanitized context/occurrence ordinal的versioned fingerprint；证明不读取raw secret作为fingerprint input、line/rotation稳定、new occurrence不同，并实现只依赖check/path/maximum policy而不依赖actual bytes/content的coverage fingerprint。
- [ ] 4.3 建立raw source/match bounded detector API与secret-safe sanitizer，确保raw bytes不越过normalizer handoff，禁止raw writer、persistent result cache、native logging及partial result/observation publication。
- [ ] 4.4 为三个metric实现exact normalized path、`{ kind: "file", identity: "file" }`无location subject与path Unicode/固定metric semantic order；为coverage实现ordered required number evidence，security evidence强制empty，并拒绝unknown/missing/wrong-kind/out-of-order result。

## 5. Detector dependency 与 capability result

- [ ] 5.1 评审并引入distribution-owned detector/rule bundle，记录license、维护/security风险与替代方案；在internal dependency slice中固定identity/version/bounds，不增加public/environment command/args。
- [ ] 5.2 实现exact-input detector adapter与Product rule normalization，覆盖unavailable、execution、invalid-result、successful zero findings和multi-file success；native/private output不进入raw artifact或cache。
- [ ] 5.3 对任一required failure丢弃partial findings/observations；证明absent/disabled skipped、requested无candidate no-input、oversized-only/non-text-only succeeded、detector success/failed状态与coverage summary可区分。

## 6. Finding、comparison、gate 与输出集成

- [ ] 6.1 将security/coverage findings接入all/changed/regressions与gate；证明`regressions`保持`changed`的order-preserving subsequence、rotation/line movement非regression、changed-scope内new occurrence/new coverage gap可为regression，safe allowlist仅排除对应blocking record。
- [ ] 6.2 只向foundation catalogs注册capability、两个check IDs、三个observation metric IDs、empty security evidence与coverage `actualBytes`/`maximumFileBytes` evidence semantics；更新expected semanticRegistryFingerprint、canonical examples与validator fixtures，通过generic machine v2/human aggregation呈现coverage，schema bytes不变且不建立secret DTO。
- [ ] 6.3 同步owner docs、catalog/schema examples及semantic Cases，证明failure只进completeness、partial findings/observations不发布、output failure仍优先。

## 7. 验证与交付审计

- [ ] 7.1 运行最窄config bounds/status/prefix/full-read/disposition/observation-order/typed-evidence/coverage/fingerprint/allowlist/adapter/channel/gate/generic-output tests，再运行product import、typecheck、lint、完整product tests和`bun run test-evidence:check`。
- [ ] 7.2 运行`bun run validate`与`bun run verify:vibe-check-workspace:required`，检查generated schema/example drift、formal producer/consumer acceptance，以及ungated/gated显式baseline入口。
- [ ] 7.3 对最终diff执行privacy canary全surface搜索、dependency/license审查、局部diff/授权范围检查，并再次严格验证本OpenSpec change；不得以测试通过替代人工确认没有真实secret或backend field进入public materials。
