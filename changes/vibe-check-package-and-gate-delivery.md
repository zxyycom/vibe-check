# Vibe Check package 与 Project Gate 交付导航

本导航说明当前 package/Gate 的读取边界，不替代 `bun run change-plan -- list changes`、active Change artifacts、current docs 或实际验证。

## Current facts

- Product is API-only: `src/index.ts` is the public programmatic entry; it has no product CLI, `bin`, subpath export, configuration discovery, or registry operation.
- Project Run owns only `outputs.machinePublication` and `outputs.progressRendering`. Project Gate owns process transcripts under `.log/project-gate/<unique>/`; those local diagnostics are not Product outputs or release artifacts.
- `@zxyycom/vibe-check@0.0.1` 已公开发布到 canonical npm registry，public `latest` 在归档审阅时指向 `0.0.1`；README 的普通 consumer 入口是 `npm install @zxyycom/vibe-check`，产品 host 仍是 Bun `>=1.3.14`。
- Exact candidate preparation, docs projection, installed-consumer acceptance and the formal workspace Gate must be regenerated after any public/runtime/docs change. A past receipt never proves a later artifact.
- `scripts/package/release/**` now provides local-only formal prepare/verify entrypoints: it requires a clean commit and explicit version/tag, writes a portable digest-bound receipt, and makes full Gate consume that receipt without falling back to local candidate preparation. No publish action exists in those entrypoints.
- `0.0.1` 的 source commit、formal receipt/tarball digests、same-artifact Gate 36/36、registry integrity、无凭据 exact npm install、types/documentation/runtime acceptance 与 annotated `v0.0.1` tag 已闭合；完整脱敏结果保存在已归档 Change 的 [release evidence](archive/publish-public-api-only-npm-package/release-evidence.md) 中。
- `publish-public-api-only-npm-package` 已以 18/18 tasks 完成并归档；当前没有 active npm release Plan。后续版本需要新的 Outcome、artifact evidence 与授权，不能恢复 archived Change 作为 current Plan。

## Current active dependencies

The post-release directions [add-html-link-validation](add-html-link-validation/), [add-network-link-validation](add-network-link-validation/), [add-secret-detection](add-secret-detection/), and [port-lizard-function-metrics-to-typescript](port-lizard-function-metrics-to-typescript/) are not a present release implementation claim.

## Reserved future direction

`define-project-run-log-evidence-boundaries` is only a reserved name for a future durable-evidence consumer, not a current active Change. That reservation does not add a logs output or block current package validation.

## Release authority

`0.0.1` 的 preflight、publish、post-publication read/install 与 tag 授权均已消费；公开版本存在不产生 continuing account、credential 或 registry-write authority。任何后续版本、Trusted Publishing/staged configuration、`npm publish`、dist-tag/access 修改、unpublish/deprecate 或新 tag 都必须建立新的精确 scope、artifact evidence 与外部写入授权。

## Verification route

For current source/package changes, run the affected target tests and Test Evidence closure, then docs/package projection and validation, typecheck/lint, Decision/Change checks, candidate acceptance and `bun run verify:vibe-check-workspace:full` as scope requires. The full Gate is evidence of the local workspace only; it is not a publish authorization.
