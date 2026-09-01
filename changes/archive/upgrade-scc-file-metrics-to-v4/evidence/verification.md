# Verification evidence

本文件记录已完成 Change 的验证事实及其环境边界。当前 consumer contract 由
[`docs/checks/file-metrics.md`](../../../docs/checks/file-metrics.md) 持有，adapter boundary 由
[`docs/scanner-dependencies.md`](../../../docs/scanner-dependencies.md) 持有；本文件和 differential artifacts 不创建
新的 runtime owner，也不把一次 Linux 运行扩展为所有平台或 consumer language 的兼容性承诺。

## Linux clean toolchain and executable

On Linux x64/glibc, `mise exec go@1.26.4 -- go version` reported `go version go1.26.4 linux/amd64`.
A clean temporary `GOBIN` install of `github.com/boyter/scc/v4@v4.0.0` reported `scc version 4.0.0`.
After the repository pin changed, `mise lock`, `mise install go go:github.com/boyter/scc/v4`, and
`bun run env:check` all succeeded; the latter reports the locked SCC v4 command and Go 1.26.4.

## Differential and protocol

[`differential/observations.json`](differential/observations.json) is the machine-readable raw 3.7.0/4.0.0
observation over the checked-in corpus. [`differential/classification.json`](differential/classification.json) is the
reviewed classification of every CSV/header, provider/path, Code, Complexity, Record and finding result. The only drift
is Rust `?` Complexity `0 → 1`, an intentional upstream correction. No Product-owned private config was adopted.

With a real SCC v4 executable and `SCC_CONFIG_PATH` containing `--cognitive`, the adapter returned a
trusted ten-column measurement through its `--no-config` invocation. The counterfactual SCC command
without `--no-config` emitted the incompatible eleventh `Cognitive` CSV column. This proves ambient config
cannot alter the production measurement contract. An explicit Product config is not applicable because none
was adopted.

## Product and consumer evidence

- Focused file-metrics suite: 11 tests passed, including exact v4 availability, `--no-config`, parser,
  scope, findings, Records and failure behavior.
- `bun run test-evidence -- check --root .`: 325 current entities mapped by 90 semantic Cases.
- Product/scripts typecheck and lint, workspace format, docs validation, Decision and Change checks passed.
- `bun run verify:vibe-check-workspace:required` and `bun run verify:vibe-check-workspace:full` passed.
  The full profile passed all 36 checks, including prepared candidate, package artifact and three installed
  external-consumer acceptances. Repository file-metric findings remain non-blocking observations; no threshold was
  adjusted as part of this Change.

## Boundary

Linux x64/glibc is the only real-install execution claim. `mise.toml` retains explicit Unix `scc` and Windows
`scc.exe` paths; Windows was not run on an actual runner. The v3 binary exists only in differential evidence;
production has no v3 pin or fallback.
