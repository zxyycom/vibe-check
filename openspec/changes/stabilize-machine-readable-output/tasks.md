执行约束：按章节顺序推进；specs 是规范性行为 owner，design 固定已确认决策，本文件只拥有
执行顺序与证明义务。1.1 的 current projection baseline 是后续 DTO/schema 的输入，不是
compatibility promise。只有实现、focused proof 与本 task 指定验证全部完成后才勾选任务。
新增、删除、重命名或修改 native test body / semantic Case 时，修改前后都运行当前
test-evidence strict check，并用 Case catalog 恢复 owner、entities 与 proves。

## 0. Change 审计门禁

- [x] 0.1 审核 proposal、design、全部 delta specs 与 tasks：产品结果、开发维护边界、
  single-active structure、positive acceptance predicate、owner 与验收路径一致；正文只保留
  已确认、可实施、可验收内容。
- [x] 0.2 对照 `make-scan-completeness-observable`、`add-ci-quality-gates` 的 archived
  artifacts、main specs 与 current TypeScript models：completeness、warning channels、
  `GateResult` 和 process outcome 已有 owner，本 change 只固定 machine projection。
- [x] 0.3 用 CodeGraph 与定向 source audit 确认边界：Product Output 产生三个 machine
  files，`quality:annotate` 读取一个 warning stream，docs validators 验证 published
  materials，workspace verifier 与 dogfood wrappers 只调度或传递。
- [x] 0.4 运行 delta inspection、OpenSpec strict validation、`bun run validate`、
  `git diff --check`、关键词审计与局部 diff 审查；确认 change 只有一个 current contract，
  artifact 权威关系与任务状态和实际证据一致。

## 1. 建立 projection 与语义 baseline

- [ ] 1.1 用正式 Product CLI 与现有 fixtures 建立 baseline，覆盖 complete-passed、
  complete-warning、legitimate-empty、gate-failed、scan-incomplete 和 controlled output
  failure。逐项记录 current serialized field/nesting/optionality/value domain、path/unit/order
  semantics 及 non-empty/zero-byte output；明确 `metadata.repository` 当前为 normalized
  absolute project root，且不从 external-config 或 scanner-port proposals 预取字段。
- [ ] 1.2 把 baseline 固定为 projection regression fixtures/tests，而不是 canonical examples
  或 compatibility suite。若任一当前字段无法从现有 owner 确定含义，先更新 change 与 owner
  docs，再开始 schema/DTO 实现。

## 2. 建立 output-owned DTO 与 schema source

- [ ] 2.1 先增加 projection tests：`MachineMetricsV1` 保留经 1.1 确认的 field set，并设置
  `vibe-check.metrics.v1`；全部 embedded warning values 使用同一个
  `MachineWarningV1` mapper 并设置 `vibe-check.warning.v1`；core `WarningRecord` 与 human
  report 不获得 transport identity；两个 stream candidates 从同一 machine DTO channels
  产生。
- [ ] 2.2 先增加 schema contract tests，固定 JSON Schema 2020-12、canonical paths、`$id`
  URNs、exact dialect URI、metrics-to-warning `$ref`、closed fixed objects、typed dynamic maps、
  required fields、field/path/unit/array-order semantic descriptions，以及代表性
  enum/nullability/numeric constraints。
- [ ] 2.3 在 `src/product/**` 的 Output owner 内实现 runtime schema-authoring source、由该
  source 派生的 DTO types、explicit mapper 与 shallow public exports。只在必要时用 `pnpm`
  增加一个 focused schema/type-inference dependency；不得建立自制 generic schema framework
  或第二份手写 field inventory。
- [ ] 2.4 实现 deterministic serializers：metrics 使用 two-space JSON 且无 final LF；
  warnings 每条使用 compact JSON + LF，empty channel 产生 zero bytes。所有 stream records
  必须来自 machine DTO，而不是第二条 core projection path。
- [ ] 2.5 从 runtime source deterministic 生成并 checked in
  `docs/schemas/vibe-check-metrics.schema.json` 与
  `docs/schemas/vibe-check-warning.schema.json`；增加 drift check，并证明 product runtime
  不读取 `docs/**` 或 `scripts/**`。

## 3. 实现 validators 与 validated publication

- [ ] 3.1 先增加 positive byte-grammar tests。Metrics 覆盖 strict UTF-8、BOM rejection、
  one root object、leading/trailing whitespace acceptance 与 trailing extra value rejection；
  warnings 覆盖 zero bytes、required single final LF、missing/extra final LF、interior blank、
  malformed/non-object record、record 内 non-LF JSON whitespace、CRLF、invalid UTF-8 与 BOM。
  JSON key order 不影响 parsed verdict。
- [ ] 3.2 实现 product-owned warning-stream validator：以 bytes 为输入，成功时返回完整 typed
  current warnings；失败时返回 logical artifact 与 applicable line/index/JSON Pointer
  diagnostic；record line 使用 1-based、record index 使用 0-based。任一失败都不得返回
  partial records。
- [ ] 3.3 先为 artifact-set invariants 增加独立 success/failure proofs：stream/channel deep
  equality；`changed` 是 `all` 的 order-preserving subsequence；`regressions` 是 `changed`
  的 subsequence；stable capability IDs exact membership/no duplicates 与 completeness
  reduction；evaluated gate 的 policy/channel、counts、blocking records/order、empty
  `acceptedReason` 与 status。
- [ ] 3.4 实现 artifact-set validator，组合 metrics/warning schemas、两个 stream validators
  与手写 set invariants；返回 all-or-nothing typed set 或 actionable logical-artifact /
  pointer/line/index/set-relationship diagnostic，不重算 scanner、warning 或 gate business
  logic。
- [ ] 3.5 先增加 publication failure tests，覆盖 candidate validation、prior-file cleanup、
  temp write 与 rename failure。证明 pre-publication failure 不写 canonical files；handled
  write failure best-effort 清除三个 canonical files 与 owned temps；output failure 退出 `2`
  且不会被 computed gate 改写。
- [ ] 3.6 将 finish flow 实现为 `core validate → one DTO → three in-memory candidates →
  artifact-set validate → clean prior canonical/owned temp files → same-directory temp writes
  and renames`。全部 canonical writes 完成后才打印 trusted paths 并返回既有 success/gate
  outcome；不宣称 multi-file transaction 或以 files alone 证明 current run。
- [ ] 3.7 增加 formal-entry outcome tests，证明 complete-passed、complete-warning、
  legitimate-empty、gate-failed 与 scan-incomplete 都产生 conforming machine set；
  scan-incomplete 保持 domain failure，contract/publication failure 保持 output failure；
  `report.md` 与 `raw/**` 既有行为不受 machine publication 重构影响。

## 4. 发布 canonical schemas 与 examples

- [ ] 4.1 建立 fixed fixture generator，按 specs 的五行 outcome matrix 从 production
  mapper/serializer 生成 `docs/examples/artifacts/<outcome>/`。每组包含三个 canonical files
  与 README；timestamp、repository root、commit、paths、config version 与 tool metadata 在
  serialization 前注入固定值。
- [ ] 4.2 生成并 checked in 五组 examples；验证 repeated generation byte-stable、zero-warning
  streams 为 zero-byte files、每个 README 准确记录 input/gate request/outcome/exit，且 retired
  Rust examples 保持独立 historical path/label。
- [ ] 4.3 扩展 independent docs validator：显式注册并 strict compile 两个 current schemas，
  独立检查 example UTF-8/framing/schema 与全部 set invariants；不得 import product validator
  作为 acceptance implementation。
- [ ] 4.4 增加 runtime/docs focused mutations 与 generation drift proofs，覆盖 specs 列出的
  identity、schema、grammar、channel、capability、completeness 与 gate predicates；断言整体
  verdict 与 actionable location，且 mutation label 不选择 test-only parser。

## 5. Hard-cut direct warning consumer

- [ ] 5.1 先增加 `quality:annotate` CLI tests：固定 `[warnings-path] [limit]`、default path、
  default `5`、`^[1-9][0-9]*$` + safe-integer limit 与 extra-argument failure；证明 conforming
  non-empty/zero-byte inputs 退出 `0`，argument/read/decoding/framing/schema failure 在 stdout
  产生 zero annotation commands、向 stderr 报告 diagnostic 并退出 `2`。
- [ ] 5.2 让 `quality:annotate` 通过 shallow product export 复用 warning-stream validator，
  以 bytes 读取 input；完整 validation 后才按既有规则过滤 `info`、应用 limit、映射 schema
  声明的 render fields。Quality annotations 继续 non-blocking。
- [ ] 5.3 增加正式 producer-to-consumer acceptance：Product CLI 生成 non-empty/zero-byte
  current streams 后交给 actual annotation CLI；从 valid output 派生代表性 invalid input，
  证明同一 validator 返回 exit `2` 且不产生 partial annotations。
- [ ] 5.4 将 acceptance 接入 required workspace profile；workspace verifier 只调度 child、
  保留 actionable output 并传播 result，dogfood wrappers 与 package `quality:*` 保持 Product
  CLI pass-through。

## 6. 同步 owners 并验证交付

- [ ] 6.1 更新 Architecture、Output、Quality Metrics、CLI、Testing、Script Tooling、
  navigation、schema/example index 与 semantic Cases；记录 DTO/core boundary、runtime schema
  owner、public field/path/order semantics、v1 paths/identities、两个 validator boundaries、set
  invariants、annotation exit `2`、evidence model 与 single-active hard cut。
- [ ] 6.2 先运行最窄的 DTO/schema/mapper/serializer/output/annotation/docs tests；测试变化前后
  运行 `bun run test-evidence:check`，并确认受影响 Cases 的 Owner/Entities/Proves 闭合。
- [ ] 6.3 运行 `bun run typecheck:product`、`bun run typecheck:scripts`、
  `bun run lint:product` 与 `bun run lint:scripts`。
- [ ] 6.4 运行 schema/example regeneration drift check、targeted producer-to-consumer
  acceptance、`bun run validate` 与 `bun run verify:vibe-check-workspace:required`。
- [ ] 6.5 重放 `quality:check`、`quality:full-check` 与 `quality:gate`，确认 current artifacts、
  annotation、exit `0`/`1`/`2` 与既有 product semantics；最后运行 OpenSpec strict
  validation、`git diff --check` 与局部 diff/关键词审计。
