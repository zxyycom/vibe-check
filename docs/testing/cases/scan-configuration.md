# scan-configuration

## Case BB-CLI-CONFIG-FILE-001: Product 显式完整配置正式入口稳定
Owner: `docs/configuration.md#configuration`
Entities:
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > does not discover a project config when --config is omitted`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > reports config failures with exit 3 before scanners or artifacts start`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > returns a warning without a quality verdict when no capability has eligible input`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > scans the checked-in project deterministically with only the configured inputs`
Proves:
- 正式入口从 fixture root 外按 normalized project root 读取 relative、absolute 与含 `..` 的 `--config`，并使用 exact version `"1"` 的 semantic checks、scope、code area、report 与 artifact settings；scanner process controls 只由 supported operational environment 提供。
- Eligible source 进入 metrics / warnings，explicit exclude 与 generated controls 不进入 scanner inputs；重复运行产生相同 Vibe Check-owned evidence。
- Config 的 artifact/top-N defaults 生效，显式 `--artifact-dir` / `--top-n` 只覆盖对应 resolved output fields，其他 semantic settings 保持不变。
- Config read / parse failure 以及 legacy top-level scanner/process fields 在 banner、scanner、cache 与 artifact 前写脱敏 stderr 并退出 `3`；formal proof 使用 eligible source 与 marker-backed operational dependency，证明不回退默认 config，也不执行 legacy command / args。
- Malformed supported `_ARGS` 即使 semantic scope 没有 eligible input，仍在 banner、scanner、cache 与 artifact 前写 actionable、脱敏 stderr 并退出 `2`。
- 未指定 `--config` 时不自动发现 project config，继续使用经同一 schema 验证的 built-in semantic config；supported `VIBE_CHECK_*` inputs 仍只解析 `ScannerDependencySnapshot`。

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

## Case WB-CONFIG-FILE-001: Product semantic config v1 parsing 稳定
Owner: `docs/configuration.md#configuration`
Entities:
- `bun|src/product/config-file.test.ts|semantic project config v1 schema > accepts a complete tool-neutral document and returns a detached value`
- `bun|src/product/config-file.test.ts|semantic project config v1 schema > exposes only closed product-semantic fields`
- `bun|src/product/config-file.test.ts|semantic project config v1 schema > maps the document to a frozen resolved config and applies only CLI overrides`
- `bun|src/product/config-file.test.ts|semantic project config v1 schema > publishes the editor schema and canonical config from the runtime source`
- `bun|src/product/config-file.test.ts|semantic project config v1 schema > rejects structural and semantic failures with field paths`
- `bun|src/product/config-file.test.ts|semantic project config file loading > loads and validates a complete UTF-8 semantic document`
- `bun|src/product/config-file.test.ts|semantic project config file loading > rejects legacy tool-shaped documents with actionable migration guidance`
- `bun|src/product/config-file.test.ts|semantic project config file loading > wraps file, UTF-8, JSON, object, and structure failures with the config path and cause`
Proves:
- Product-owned `SemanticProjectConfigV1` runtime schema 接受 exact version `"1"` 的完整 tool-neutral document，保持 finite-number acceptance，并返回与 raw input detached 的 schema-derived value。
- Semantic schema 对 root 与 nested object 保持 closed fields，不接受 `$schema`、legacy scanner/process fields 或 backend warning identity；missing、unknown、wrong-version、non-finite、invalid time zone 与非法 code-area reference 均以 field path 失败。
- Published JSON Schema 2020-12 editor projection 与 runtime schema 同源并保持 exact-byte drift proof；checked-in canonical config 同时通过独立 Ajv 与 Product runtime validation，schema-document `$schema` metadata 不进入 base config instance fields。
- 单一显式 mapper 把 validated semantic document 转为 deeply frozen `ResolvedQualityConfig`，只接受 artifact directory 与 top-N 两项 CLI overrides，不做 partial merge。
- Legacy top-level `lizard` / `scc` / `jscpd` / `tools` 在 semantic schema parsing 前产生 typed migration failure；诊断说明 semantic `checks.*` 与 operational `VIBE_CHECK_*` landing，且不读取、执行或回显 legacy command / args value。
- Missing、unknown、invalid nested、invalid time zone、non-object、invalid UTF-8 / JSON、非 regular file 与 read failure 直接失败。
- File-level error 保留 resolved config path 与原始 cause。
