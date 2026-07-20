## 0. Change 审计门禁

- [x] 0.1 审核 proposal、design、全部 delta specs 与 tasks：产品结果、开发维护边界、
  单一 current structure、正向 acceptance predicate、owner 与验收路径一致；所有产品
  决策均已显式确定，正文只保留可实施、可验收内容。
- [x] 0.2 对照 `make-scan-completeness-observable`、`add-ci-quality-gates` 的 archived
  artifacts、main specs 与 current TypeScript models：completeness、warning channels、
  `GateResult` 和 process outcome 已有 owner，本 change 只固定 machine projection。
- [x] 0.3 用 CodeGraph 与定向 source audit 确认边界：Product Output 产生三个 machine
  files，`quality:annotate` 读取一个 warning stream，docs validators 验证 published
  materials，workspace verifier 与 dogfood wrappers 只调度或传递。
- [x] 0.4 运行 delta inspection、OpenSpec strict validation、`bun run validate`、
  `git diff --check`、关键词审计与局部 diff 审查；确认 change 只定义一个 current
  structure，任务状态与实际证据一致。

## 1. Establish the projection baseline

- [ ] 1.1 用正式 Product CLI 和现有 fixtures 建立 projection baseline，覆盖 current
  serialized fields、warning order、non-empty/empty bytes、complete/gate-failed/
  scan-incomplete outcomes 与 controlled output failure。Baseline 只服务 projection
  regression tests，不进入 canonical examples。

## 2. Add output-owned DTO and schema source

- [ ] 2.1 先增加 projection tests：`MachineMetricsV1` 保留 current serialized metrics
  shape 并设置 `vibe-check.metrics.v1`；所有 embedded warning values 投影为
  `MachineWarningV1` 并设置 `vibe-check.warning.v1`；core `WarningRecord` 与 human
  report 不获得 transport identity；两个 stream candidates 从同一个
  `MachineMetricsV1.warnings` channels 产生。
- [ ] 2.2 先增加 schema contract tests，固定 JSON Schema 2020-12、canonical paths、
  `$id` URNs、metrics-to-warning `$ref`、closed objects、required fields、代表性
  enum/nullability/numeric/dynamic-map constraints。
- [ ] 2.3 在 `src/product/**` Output owner 内实现 runtime schema definitions、DTO
  types/structural checks 与 explicit mapper；确保 core-only fields 不会因 object spread
  自动进入 public transport。
- [ ] 2.4 从 runtime definitions deterministic 生成并 checked in
  `docs/schemas/vibe-check-metrics.schema.json` 与
  `docs/schemas/vibe-check-warning.schema.json`；增加 drift check 并确认 product runtime
  不读取 `docs/**` 或 `scripts/**`。

## 3. Validate candidates before publication

- [ ] 3.1 先增加 byte-framing tests，覆盖 valid metrics object、valid non-empty warning
  stream、zero-byte stream、invalid UTF-8、malformed/non-object record 与 missing final
  LF；JSON key order 和 insignificant whitespace 不改变 parsed verdict。
- [ ] 3.2 实现 product-owned warning-stream validator，以 bytes 为输入并返回 typed
  current warnings 或包含 artifact、line/index/JSON Pointer 的 actionable diagnostic；
  任一 input failure 不返回 partial records。
- [ ] 3.3 先为每个手写 set invariant 增加 success/failure tests：changed/all deep
  equality、completeness reduction，以及 evaluated gate 的 policy/channel、counts、
  blocking records/order 与 status。
- [ ] 3.4 实现 artifact-set validator，组合 metrics/warning schemas、两个 stream
  validators 与手写 set invariants；core business validation 继续由既有 core owner 负责。
- [ ] 3.5 将 finish flow 改为“core validate → DTO/bytes → artifact-set validate → clean
  prior canonical machine files → write all candidates”；publication 完成后才打印可信
  paths 并返回 `success` / `gate-failed`。
- [ ] 3.6 增加 validation/cleanup/write failure 与 formal-entry tests，证明 output
  failure 退出 `2`，不会被 computed gate 改写；complete passed/warning、legitimate empty、
  gate-failed 与 scan-incomplete 均产生符合 current contract 的 machine set。

## 4. Publish canonical schemas and examples

- [ ] 4.1 在 `docs/examples/artifacts/` 创建 `complete-passed`、
  `complete-warning`、`legitimate-empty`、`gate-failed` 与 `scan-incomplete` sets，每组
  包含三个 canonical files 和说明 fixed input/outcome 的 README。
- [ ] 4.2 使用 production DTO/serializer 与 fixed core fixture values 生成 examples；
  timestamp、repository/path、commit 与 tool versions 在 serialization 前注入，重复
  generation 必须 byte-stable 且无 diff。
- [ ] 4.3 扩展 docs validators：显式注册并 strict compile 两个 v1 schemas，检查 generated
  schema drift、example UTF-8/framing、metrics/record schema 与全部手写 set invariants。
- [ ] 4.4 增加 focused mutations，覆盖 identity、代表性 required/type/enum/
  closed-shape、framing 与 changed/all mismatch；每项调用 owning validator。保持 retired
  Rust schemas/examples 的历史 label/path，且不注册为 current validation input。

## 5. Hard-cut the direct warning consumer

- [ ] 5.1 先增加 `quality:annotate` parser/CLI tests：conforming non-empty stream 全量
  render 并退出 `0`，zero-byte stream 无 annotations 并退出 `0`，参数/读取/decoding/
  framing/schema failure 产生 zero annotations 并退出 `2`。
- [ ] 5.2 让 `quality:annotate` 复用 product-owned warning-stream validator 并以 bytes
  读取 input；只在完整 validation 后映射 schema 声明的 render fields，quality annotations
  继续 non-blocking。
- [ ] 5.3 增加正式 producer-to-consumer acceptance：Product CLI 生成 non-empty/
  zero-byte current stream 后交给实际 annotation CLI；代表性 invalid input 通过同一
  validator 返回 exit `2` 且不产生 partial annotations。
- [ ] 5.4 将 producer-to-consumer acceptance 接入 required workspace profile；workspace
  verifier 只调度 child command 并传播 exit/output，dogfood wrappers 保持 Product CLI
  pass-through。

## 6. Synchronize owners and verify delivery

- [ ] 6.1 更新 Architecture、Output、Quality Metrics、CLI、Testing、Script Tooling、
  navigation、schema/example index 与 case ledger；记录 DTO/core boundary、runtime schema
  owner、v1 paths/identities、两个 validator boundaries、set invariants、annotation exit
  `2` 与 single-active hard cut。
- [ ] 6.2 运行受影响 DTO/schema/serializer/output/annotation/docs tests，以及
  `bun run typecheck:product`、`bun run typecheck:scripts`、`bun run lint:product` 与
  `bun run lint:scripts`。
- [ ] 6.3 运行 schema/example regeneration drift check、targeted producer-to-consumer
  acceptance、`bun run validate` 与 `bun run verify:vibe-check-workspace:required`。
- [ ] 6.4 重放 `quality:check`、`quality:full-check` 与 `quality:gate`，确认 current
  artifacts、annotation、exit `0`/`1`/`2` 与既有 product semantics；最后运行 OpenSpec
  strict validation、`git diff --check` 与局部 diff/关键词审计。
