# scan-configuration

## Case BB-CLI-CONFIG-FILE-001: Product configuration workflow 正式入口稳定
Owner: `docs/configuration.md#configuration`
Entities:
- `bun|src/product/config-default-workflow-acceptance.test.ts|formal CLI project configuration workflow > observes a clean project with neutral defaults and requires file policy for a gate`
- `bun|src/product/config-default-workflow-acceptance.test.ts|formal CLI project configuration workflow > materializes the neutral default and discovers equivalent runtime inputs without trusting sibling schema`
- `bun|src/product/config-selection-workflow-acceptance.test.ts|formal CLI project configuration workflow > keeps explicit selection authoritative and invalid explicit files final`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > reports config failures with exit 3 before scanners or artifacts start`
- `bun|src/product/configured-project-completeness.test.ts|formal CLI configured scan completeness > returns a warning without a quality verdict when no capability has eligible input`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > scans the checked-in project deterministically with only the configured inputs`
Proves:
- Clean project 的 ungated scan 使用 `default (not persisted)` neutral policy；任一 gate 都要求 file-backed policy，缺失时在 dependency、scanner、cache 与 artifact work 前以 exit `3` 失败，并同时给出 `init` 与 `--config` recovery path。
- `init` 首次确保 discovery-ready config/schema 存在；单个 target 缺失时只补齐该文件，完整重复执行为 no-op，且两种重复路径都保持已有 target bytes。随后 omitted-config scan 选择 fixed `discovered` config，production loader 使用 embedded schema 校验 config，sibling editor schema 不参与 runtime acceptance。
- Explicit config 在 fixed discovered candidate 之上保持 authoritative，其 include、artifact 与 report settings 进入可观察扫描结果；invalid explicit file 是 final selection，以 exit `3` 失败且不回退 discovered source、不产生 artifact 或修改任一 candidate bytes。
- 正式入口从 fixture root 外按 normalized project root 读取 relative、absolute 与含 `..` 的 `--config`，并使用 exact version `"1"` 的 semantic checks、scope、code area、report 与 artifact settings；scanner process controls 只由 supported operational environment 提供。
- Eligible source 进入 metrics / warnings，explicit exclude 与 generated controls 不进入 scanner inputs；重复运行产生相同 Vibe Check-owned evidence。
- Config 的 artifact/top-N defaults 生效，显式 `--artifact-dir` / `--top-n` 只覆盖对应 resolved output fields，其他 semantic settings 保持不变。
- Config read / parse failure 以及 legacy top-level scanner/process fields 在 banner、scanner、cache 与 artifact 前写脱敏 stderr 并退出 `3`；formal proof 使用 eligible source 与 marker-backed operational dependency，证明不回退默认 config，也不执行 legacy command / args。
- Malformed supported `_ARGS` 即使 semantic scope 没有 eligible input，仍在 banner、scanner、cache 与 artifact 前写 actionable、脱敏 stderr 并退出 `2`。
- Supported `VIBE_CHECK_*` inputs 只解析 `ScannerDependencySnapshot`，不参与 default / discovered / explicit semantic selection 或 `ResolvedQualityConfig` mapping。

## Case WB-CLI-CONFIG-OPTIONS-001: Product config option presence 稳定
Owner: `docs/configuration.md#selection-and-path-rules`
Entities:
- `bun|src/product/args.test.ts|product config argument parsing > keeps config-dependent options absent when callers omit them`
- `bun|src/product/args.test.ts|product config argument parsing > preserves config path forms and explicit option presence`
- `bun|src/product/args.test.ts|product config argument parsing > rejects duplicate config flags and a missing config value`
Proves:
- Relative、absolute 与含 `..` 的 config values 保持 parser input。
- Omitted `--config`、`--top-n` 与 `--artifact-dir` 保持 option absence，供 selected config 提供值。
- Duplicate 或 missing-value `--config` 直接失败。

## Case WB-CONFIG-SELECTION-001: Product project configuration selection 稳定
Owner: `docs/configuration.md#selection-and-path-rules`
Entities:
- `bun|src/product/cli.test.ts|configuration workflow scan preflight > prints selected config provenance before dependency preflight`
- `bun|src/product/cli.test.ts|configuration workflow scan preflight > requires a file-backed policy before dependency preflight for every gate`
- `bun|src/product/config-selection.test.ts|project configuration selection > discovers only the fixed path and uses the neutral default only for an absent ungated candidate`
- `bun|src/product/config-selection.test.ts|project configuration selection > keeps selected file and candidate inspection errors terminal`
- `bun|src/product/config-selection.test.ts|project configuration selection > requires a file-backed policy for every gate and reports both recovery paths`
- `bun|src/product/config-selection.test.ts|project configuration selection > selects explicit over discovered policy and applies CLI overrides after validation`
Proves:
- Explicit config 优先于 fixed discovered candidate，相对路径基于 normalized project root 解析；validated complete document 再应用 `--artifact-dir` / `--top-n` overrides，其他 semantic fields 保持 selected value。
- 省略 explicit config 时只检查 `<project-root>/.vibe-check/config.json`；candidate 存在时选择带 normalized path 的 `discovered` source，只有 candidate 缺失且 gate disabled 时才选择 pathless neutral `default`。
- 任一 gate 缺少 file-backed source 时，在 dependency preflight 与 artifact work 前失败，diagnostic 携带 fixed candidate path，并同时给出 `init` 与 `--config` recovery paths。
- Selected explicit file 的 load failure 与 fixed candidate 的非缺失 inspection failure 都保留 path/cause 并终止本次 selection，不回退 discovered/default。
- CLI 在 dependency preflight 前精确输出 `default`、`discovered` 或 `explicit` provenance；file-backed source 输出 resolved path，neutral default 明确标记为未持久化。

## Case WB-CONFIG-FILE-001: Product semantic config/document parsing 稳定
Owner: `docs/configuration.md#configuration`
Entities:
- `bun|src/product/config-document.test.ts|neutral project config foundation > composes optional authoring metadata over the closed semantic schema and detaches it`
- `bun|src/product/config-document.test.ts|neutral project config foundation > pins the complete neutral semantic value and maps a detached runtime config`
- `bun|src/product/config-validation.test.ts|semantic project config v1 schema > accepts a complete tool-neutral document and returns a detached value`
- `bun|src/product/config-schema.test.ts|semantic project config v1 schema > exposes only closed product-semantic fields`
- `bun|src/product/config-validation.test.ts|semantic project config v1 schema > maps the document to a frozen resolved config and applies only CLI overrides`
- `bun|src/product/config-schema.test.ts|semantic project config v1 schema > publishes the editor schema and canonical config from the runtime source`
- `bun|src/product/config-validation.test.ts|semantic project config v1 schema > rejects structural and semantic failures with field paths`
- `bun|src/product/config-file.test.ts|semantic project config file loading > loads and validates a complete UTF-8 semantic document`
- `bun|src/product/config-document.test.ts|semantic project config file loading > loads equivalent strict and annotated documents through one detached semantic mapping`
- `bun|src/product/config-file.test.ts|semantic project config file loading > rejects legacy tool-shaped documents with actionable migration guidance`
- `bun|src/product/config-file.test.ts|semantic project config file loading > wraps file, UTF-8, JSON, object, and structure failures with the config path and cause`
Proves:
- Product-owned neutral semantic value 与当前 neutral-default requirement 的完整字段逐项相等，通过 semantic schema/post-validation，并映射为 detached、deeply frozen runtime config；selection context 的 closed source values 是 `default`、`explicit` 与 `discovered`，file-backed variants 携带 normalized path。
- Product-owned `SemanticProjectConfigV1` runtime schema 接受 exact version `"1"` 的完整 tool-neutral document，保持 finite-number acceptance，并返回与 raw input detached 的 schema-derived value。
- Semantic schema 对 root 与 nested object 保持 closed fields，不接受 `$schema`、legacy scanner/process fields 或 backend warning identity；missing、unknown、wrong-version、non-finite、invalid time zone 与非法 code-area reference 均以 field path 失败。
- Composed document schema 复用 semantic runtime properties，只增加 optional string `$schema`；document parsing 执行同一 semantic post-validation，并将 authoring metadata 从 detached semantic result 分离。
- Published JSON Schema 2020-12 editor projection 与 runtime schema 同源并保持 exact-byte drift proof；checked-in canonical config 同时通过独立 Ajv 与 Product runtime validation，schema-document `$schema` metadata 不进入 base config instance fields。
- 单一显式 mapper 把 validated semantic document 转为 deeply frozen `ResolvedQualityConfig`，只接受 artifact directory 与 top-N 两项 CLI overrides，不做 partial merge。
- Legacy top-level `lizard` / `scc` / `jscpd` / `tools` 在 semantic schema parsing 前产生 typed migration failure；诊断说明 semantic `checks.*` 与 operational `VIBE_CHECK_*` landing，且不读取、执行或回显 legacy command / args value。
- 同一 file loader 接受 strict JSON、line/block comments 与 trailing commas；等价 document 映射为相同 detached semantic value。Missing、unknown、invalid nested、invalid time zone、non-object、invalid UTF-8 / JSON、非 regular file 与 read failure 直接失败。
- File-level error 保留 resolved config path 与原始 cause。

## Case WB-CONFIG-INIT-001: Product project configuration initialization 稳定
Owner: `docs/configuration.md#initialization`
Entities:
- `bun|src/product/config-init.test.ts|project configuration initialization > cleans only invocation-owned files and removes an owned directory only when empty`
- `bun|src/product/config-init.test.ts|project configuration initialization > creates a complete discovery-ready file set in a new project`
- `bun|src/product/config-init.test.ts|project configuration initialization > generates deterministic commented config and an anonymous editor schema`
- `bun|src/product/config-init.test.ts|project configuration initialization > keeps existing regular targets byte-for-byte and creates only missing targets`
- `bun|src/product/config-init.test.ts|project configuration initialization > preserves an exclusive-create race while removing owned partial files`
- `bun|src/product/config-init.test.ts|project configuration initialization > rejects invalid roots, a symlinked tool directory, and non-regular targets`
- `bun|src/product/config-init.test.ts|project configuration initialization > reuses a normal tool directory without changing sibling entries`
Proves:
- Initializer candidates 产生 byte-for-byte 确定、LF-only 且 newline-terminated 的 commented config 与 anonymous editor schema；config 只携带 product-owned section comments 与 schema reference，重新解析为 complete neutral semantic value，并通过生成 schema 的独立验证。
- 新 project 一次创建 exact candidate config/schema 文件集，生产 loader 可重新读取 neutral semantic value，结果携带解析后的两个路径与 `discovery-ready` 状态。
- 已有的 normal `.vibe-check` 目录可复用且 sibling entries 保持不变；已有 regular targets 保持 byte-for-byte，不读取或改写其内容。两份 target 都存在时重复执行为 no-op；仅缺一份时只 exclusive-create missing target，并成功返回 `discovery-ready`。
- Missing 或非目录 project root、symlinked `.vibe-check` 目录，以及 symlink、directory 等 non-regular target 都在 unsafe write 前失败；external target bytes 与尚未创建的 sibling target 保持不变。
- Exclusive-create race 失败时保留竞争方创建的 target，并移除本 invocation 先前创建的 partial file。其它 write failure cleanup 同样只移除本 invocation 所有的文件；只有当目录由本 invocation 创建且 cleanup 时仍为空才移除它，并发加入的其它 owner entry 保留。
