Section 0 是进入 implementation 的 change 审计门禁；通过后按 phase 1-5 实施。Phase 3 的
selection cutover 同时包含 repository file-backed policy。每个 implementation task 只有在
focused proof 和必要 owner/Case 同步完成后才勾选。

修改测试正文或实体前运行 `bun run test-evidence:check`，并查询相关 Cases；修改后先跑最窄测试，
再运行完整 check。

## 0. Change 审计门禁

- [x] 0.1 已核对 Product CLI、Product Config、formal entry、external fixture 和 dogfood wrapper；
  `src/product/**` 继续拥有产品运行时，wrapper 只传递 repository root 与 caller input/output/status。
- [x] 0.2 已确认单一 neutral full-project default、complete persisted document，以及
  `explicit > discovered > default` selection；任一 gate 使用 file-backed policy。
- [x] 0.3 已确认 semantic config 与 scanner dependency 的独立 owner，并核对 Bun JSONC parser、
  TypeBox schema composition、runtime schema authority 和 generated editor projection。
- [x] 0.4 已确认 init 的 deterministic generation、existing-directory reuse、exclusive targets 与
  invocation-owned cleanup 模型。
- [x] 0.5 按 `ai-ready-docs` 审核全部 change artifacts：目标、artifact owner、术语、数据流、边界与
  implementation phases 可独立恢复；正文只保留目标状态、必要 compatibility 和安全边界。运行
  neutral-default semantic parse、OpenSpec strict validation、`bun run validate`、
  `bun run decisions:check`、`bun run verify:vibe-check-workspace:required`、目标状态/owner 一致性
  审计与局部 diff review。

## 1. Default and Document Foundation

- [ ] 1.1 恢复 scan-configuration、CLI、scan-scope 和 external-fixture Cases，记录本 phase 的证明
  目标。
- [ ] 1.2 在 Product Config 定义 spec-pinned `NeutralProjectConfig`，并通过 existing semantic
  schema/post-validation。
- [ ] 1.3 定义 `ConfigDocument`、`SelectedConfig` 和 closed source union；file-backed source 携带
  normalized path。
- [ ] 1.4 从 semantic runtime schema 组合 optional `$schema` document schema，并让单一 loader
  接受 UTF-8 Vibe Check JSON 和 strict JSON subset。
- [ ] 1.5 增加 focused default/document tests：exact values、schema、round-trip、JSON grammar、
  diagnostics 和 detached mapping；同步相关 Cases。

## 2. Initialization

- [ ] 2.1 增加 `init [project-root]` routing、root/init help 和 operation-specific CLI runtime。
- [ ] 2.2 从 `NeutralProjectConfig` deterministic 生成 commented config；reload 后的 semantic value
  与 source value 深度相等。
- [ ] 2.3 从 composed document schema 生成 deterministic editor schema，并建立 independent compile、
  validation 和 drift proof。
- [ ] 2.4 实现 project-root validation、tool-directory create/reuse、exclusive target writes 和 exact
  owned cleanup；成功输出 created paths 和 discovery-ready 状态。
- [ ] 2.5 增加 init tests：deterministic bytes、existing-directory preservation、target race/failure、
  symlink handling 和 zero scan invocation；同步相关 Cases。

## 3. Selection and Dogfood

- [ ] 3.1 把 repository policy 保存到 `<repo-root>/.vibe-check/config.json` 并生成对应 schema；先用
  existing explicit loader 验证 document。
- [ ] 3.2 实现 `explicit > discovered > default` selection；gate request
  只接受 file-backed source，selected-file error 直接形成 config failure。
- [ ] 3.3 在 selection 后应用 `--top-n` / `--artifact-dir`，输出 concise provenance，并把一个
  resolved config 交给 dependency preflight 和 scan core。
- [ ] 3.4 同步 root/scan help、exit `3` diagnostics 和 repository dogfood；root-only wrapper 保持
  caller args/output/status pass-through。
- [ ] 3.5 增加 selection/dogfood tests：explicit precedence、discovery、ungated default、gate
  prerequisite、file error、cwd independence、CLI overrides 和 `quality:*` discovery；同步 Cases。

## 4. Formal Acceptance

- [ ] 4.1 使用 clean external-fixture copies 证明 zero-config observation、gate prerequisite 和 init
  后 discovery。
- [ ] 4.2 证明 in-memory default 与 materialized config 的 semantic value、scope、exact inputs 和
  report settings 相等；覆盖 explicit precedence 和 terminal file error。
- [ ] 4.3 证明 existing-directory/target safety、handled cleanup、schema drift 和 sibling-schema
  independence。
- [ ] 4.4 证明 quick/full/default/gate dogfood entries 发现 repository policy；同步全部 changed test
  entities 的 Cases 并运行 `bun run test-evidence:check`。

## 5. Owners and Verification

- [ ] 5.1 更新 CLI、Configuration、Scan Scope、Architecture、Testing、Script Tooling 和 navigation
  owners。
- [ ] 5.2 运行 focused config/init/CLI/formal-entry/dogfood tests 和完整 `bun run test:product`。
- [ ] 5.3 运行 product/scripts typecheck、lint 和 product import-boundary checks。
- [ ] 5.4 从 project root 外重放 default observation、gate prerequisite、init/discovery、explicit
  config、invalid document、schema independence 和 dogfood smoke。
- [ ] 5.5 运行 `bun run test-evidence:check`、`bun run decisions:check`、`bun run validate`、
  `bun run verify:vibe-check-workspace:required`、OpenSpec strict validation 和 `git diff --check`。
