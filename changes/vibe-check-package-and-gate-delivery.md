# Vibe Check package 与 Project Gate 交付导航

本导航说明当前 package/Gate 的读取边界，不替代 `bun run change-plan -- list changes`、active Change artifacts、current docs 或实际验证。

## Current facts

- Product is API-only: `src/index.ts` is the public programmatic entry; it has no product CLI, `bin`, subpath export, configuration discovery, or registry operation.
- Project Run owns only `outputs.machinePublication` and `outputs.progressRendering`. Project Gate owns process transcripts under `.log/project-gate/<unique>/`; those local diagnostics are not Product outputs or release artifacts.
- Exact candidate preparation, docs projection, installed-consumer acceptance and the formal workspace Gate must be regenerated after any public/runtime/docs change. A past receipt never proves a later artifact.
- `scripts/package/release/**` now provides local-only formal prepare/verify entrypoints: it requires a clean commit and explicit version/tag, writes a portable digest-bound receipt, and makes full Gate consume that receipt without falling back to local candidate preparation. No publish action exists in those entrypoints.
- The only active release Plan is [publish-public-api-only-npm-package](publish-public-api-only-npm-package/). It first establishes a formal-version exact artifact, then consumes current candidate/Gate/docs owners without implementing missing runtime contracts or authoring API semantics.

## Current active dependencies

The post-release directions [add-html-link-validation](add-html-link-validation/), [add-network-link-validation](add-network-link-validation/), [add-secret-detection](add-secret-detection/), and [port-lizard-function-metrics-to-typescript](port-lizard-function-metrics-to-typescript/) are not a present release implementation claim.

## Reserved future direction

`define-project-run-log-evidence-boundaries` is only a reserved name for a future durable-evidence consumer, not a current active Change. That reservation does not add a logs output or block current package validation.

## Release authority

Local validation may prepare and verify candidate material. It does not authorize registry reads, credential access, version reservation, Trusted Publishing configuration, `npm publish`, or post-publication installation. Before each such action, obtain scoped user authorization naming the operation and target artifact/version.

## Verification route

For current source/package changes, run the affected target tests and Test Evidence closure, then docs/package projection and validation, typecheck/lint, Decision/Change checks, candidate acceptance and `bun run verify:vibe-check-workspace:full` as scope requires. The full Gate is evidence of the local workspace only; it is not a publish authorization.
