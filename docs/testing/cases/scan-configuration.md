# scan-configuration

## Case BB-CLI-CONFIG-FILE-001: Product 显式完整配置正式入口稳定
Owner: `docs/configuration.md#configuration`
Entities:
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > does not discover a project config when --config is omitted`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > reports config failures with exit 3 before scanners or artifacts start`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > scans the checked-in project deterministically with only the configured inputs`
Proves:
- 正式入口从 fixture root 外按 normalized project root 读取 relative、absolute 与含 `..` 的 `--config`，并使用 explicit version、scope、code area、threshold、report、 artifact 和 controlled tools。
- Eligible source 进入 metrics / warnings，explicit exclude 与 generated controls 不进入 scanner inputs；重复运行产生相同 Vibe Check-owned evidence。
- Config 的 artifact/top-N defaults 生效，显式 `--artifact-dir` / `--top-n` 只覆盖对应 output option；`VIBE_CHECK_*` command / args 不重写或阻断 explicit tool settings。
- Config read / parse failure 在 scanner 与 artifact 前写 stderr 并退出 `3`，不回退默认 config。
- 未指定 `--config` 时不自动发现 project config，继续使用 `DEFAULT_CONFIG` 并保留默认分支的 `VIBE_CHECK_*` overrides。

## Case WB-CLI-CONFIG-OPTIONS-001: Product config option presence 稳定
Owner: `docs/configuration.md#配置选择`
Entities:
- `bun|src/product/args.test.ts|product config argument parsing > keeps config-dependent options absent when callers omit them`
- `bun|src/product/args.test.ts|product config argument parsing > preserves config path forms and explicit option presence`
- `bun|src/product/args.test.ts|product config argument parsing > rejects duplicate config flags and a missing config value`
Proves:
- Relative、absolute 与含 `..` 的 config values 保持 parser input。
- Omitted `--config`、`--top-n` 与 `--artifact-dir` 保持 option absence，供 selected config 提供值。
- Duplicate 或 missing-value `--config` 直接失败。

## Case WB-CONFIG-FILE-001: Product 完整 JSON 配置 parsing 稳定
Owner: `docs/configuration.md#configuration`
Entities:
- `bun|src/product/config-file.test.ts|complete quality config parsing > rejects incomplete, unknown, and invalid nested values`
- `bun|src/product/config-file.test.ts|complete quality config parsing > rejects non-object input`
- `bun|src/product/config-file.test.ts|complete quality config parsing > returns a detached QualityConfig with the supplied values unchanged`
- `bun|src/product/config-file.test.ts|quality config file loading > loads a complete UTF-8 JSON file`
- `bun|src/product/config-file.test.ts|quality config file loading > wraps file, UTF-8, JSON, object, and structure failures with the config path and cause`
Proves:
- 完整 `QualityConfig` JSON 返回字段值不变且与输入 detached 的 typed value。
- Missing、unknown、invalid nested、invalid time zone、non-object、invalid UTF-8 / JSON、非 regular file 与 read failure 直接失败。
- File-level error 保留 resolved config path 与原始 cause。
