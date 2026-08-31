# Proposal

本 Plan 修复 jscpd 临时 config 对 project-relative exact path 的错误坐标解释，并使该错误产生的 duplicate raw cache 失效。

## Why

`duplicateDetection` 的 public data flow 将 approved exact scope 表示为相对项目根的 slash paths。Plan 形成时，jscpd adapter 在项目根外的系统临时目录创建 config，却把这些相对路径原样写入 `config.path`。jscpd 因而相对 config 目录，而非 invocation project root，寻找文件；它可正常输出空 report，使真实重复代码被结算为 `passed`。

已在隔离复现中确认：同一对重复文件以绝对路径直调 adapter 时产生一个 measurement；以 public Check 的 project-relative handoff 执行时得到零 Finding 和 `passed` aggregate。

## Outcome

无论 jscpd 临时 config 位于哪个项目根外目录，`duplicateDetection` 都只扫描本次 approved exact scope 的真实项目文件。真实 blocking duplicate 必须产生 Finding，并使 Check 及显式 `all` aggregate 为 `failed`。修复前写入的 duplicate raw cache 不得被修复后的 invocation 复用。

## Scope

### Intended Change

- 仅在 duplicate-detection 的 jscpd adapter 写 config 前，用本次 invocation `cwd` 将 approved exact paths 转为平台原生绝对路径。
- 保持 project-relative paths 作为 file selection、fingerprint、Record、report normalization 和 exact-scope reconciliation 的 identity；不改变 public options 或 aggregation。
- 提升 duplicate raw-scan configuration version，使旧 raw evidence cache miss；新 invocation 仍可按既有规则复用。
- 将现有 real-jscpd 与 public Check 测试改为证明上述真实 handoff 和 blocking settlement，并把 installed external-consumer fixture 的旧零 Finding 断言改为实际 duplicate evidence。

### Resulting Impacts

- 第一次升级后会重新扫描 duplicate raw evidence；其它 Check 和 machine artifacts 不受影响。
- 自定义 jscpd executable 继续只接收 adapter-owned protocol，但读取的临时 config 中 `path` 将为绝对路径；这不是新的 public capability。
- external-consumer fixture 在 Plan 形成时已经写入两份相同 source，但 runtime acceptance 错误断言零 Finding；它必须随修复改为 non-blocking `passed`、一个只含 fixture 两文件 locations 的 trusted duplicate Finding/Record 的发布物证据。
- 此修复不改变已发布的 `@zxyycom/vibe-check@0.0.1`；消费者须升级到包含修复的后续版本才能获得行为修正。

## Success Criteria

- public `duplicateDetection` 以两个 project-relative 重复 TypeScript 文件执行真实 jscpd 时，至少产生一个 trusted duplicate Record；blocking policy 下 Check 和 explicit `all` aggregate 均为 `failed`。
- 临时 config 的 `path` 按 invocation `cwd` 解析为绝对路径；jscpd report 仍归一化为 project-relative identity；仅剥离同一 duplicate `format` 对应的 `:format` suffix，且 out-of-scope measurement 仍整批拒绝。
- 修复前后 raw cache identity 不同；修复后首次 scan 为 miss，随后相同 invocation 命中新写 evidence。
- 既有 missing command、nonzero exit、missing/empty/malformed report、exact-scope rejection 与 cache-write-failure 仍按 owning Check 语义 fail closed。
- installed external-consumer fixture 的两份重复 source 在 package candidate 中得到 `duplicateOutcome: "passed"`、`duplicateData: { blockingFindingCount: 0, findingCount: 1 }`，并发布恰好一个 `duplicate-detection` trusted non-blocking Record，且 locations 为两份 fixture files；`parserEvidence.duplicate` 继续是其独立 parser-contract 的零值输入。
- 受影响测试、Test Evidence closure 和 required workspace Gate 通过；package candidate、installed external-consumer runtime acceptance 与 full Project Gate 统一由公开入口 `bun run package:verify` 闭合。

## Affected Owners

- `src/package-checks/duplicate-detection/jscpd/scanner.ts`：临时 config 与 jscpd process invocation。
- `src/package-checks/duplicate-detection/cache/identity.ts`：duplicate raw-scan cache invalidation boundary。
- `src/package-checks/duplicate-detection/jscpd/scanner.test.ts`、`default-check.test.ts` 与 `cache/store.test.ts`：adapter、public settlement 与 cache 回归。
- `docs/testing/cases/check-owned-scanners.md`：每次测试正文或 entity 变动都审阅 Case owner、membership 与 Proves；仅在语义需要时更新，且不创建重复 Case。
- `scripts/package/candidate/external-consumer/runtime.ts`、`fixtures/runtime.mjs`、`runtime-evidence.ts` 与 `runtime.test.ts`：fixture 的重复输入、Run/Record evidence 投影和 installed-package assertion。
