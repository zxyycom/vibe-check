# Tasks

Readiness 已关闭 ordinary/native/process authoring、caller、dependency 与 candidate 门禁。Implementation 从 1.1 开始，依次完成 catalog cutover、caller/owner 同步与 current exact Gate handoff；checkbox 只按实际实现和验证证据更新。

## Readiness

以下 `0.x` 是 Plan 形成时、实施前的 Readiness 记录；其中的旧 catalog 数量、默认 profile 与
Decision alignment 不是当前实现状态。当前 Gate 行为、验证与发布边界分别由 Script Tooling、正式
tests/roots 和 `gate-optimization-handoff.md` 证明。

- [x] 0.1 恢复 Plan 形成时的 Script Tooling owner、20-entry catalog、bound Run、active Decisions 与 package API documentation handoff，确认本 Change 不再等待其它 active Change。
- [x] 0.2 将 20 个迁移 identities 归类为 14 个 target identities，固定 target required/full 可同集、显式 full 选择全部 target Checks，以及每项 retain/merge/delete 理由。
- [x] 0.2.1 在 Plan 形成时建立 active unaligned Decision `default-project-gate-to-required-profile`，固定无参 adapter 与默认 root 选择 required、显式 full 选择当前全部 Checks且不制造虚假 full-only差异的目标；该 Decision 当前已 aligned。
- [x] 0.2.2 在 Plan 形成时以 active unaligned Decision `integrate-foundation-into-workspace-assurance` 修订历史 Foundation package-gate方向，固定四个 legacy identities删除、真实不变量转入 workspace owner或专门测试的目标；该 Decision 当前已 aligned。
- [x] 0.3 运行不写工作区文件的最小 prototype，证明 native、signal-aware process-backed 和 eligibility-wrapped N/A Checks 可作为 ordinary `Check` 进入同一 Definition；raw statuses 为 passed/passed/not-applicable，eligible aggregate 为 passed，不需要第二 authoring model。
- [x] 0.4 完成 capability/CLI caller 审计：为每个 retained root/focused adapter 记录独立 consumer，并确认 Foundation manifest、专用 tsconfig、workspace importer 和 scoped CLI 仅服务旧 Gate/package 自身，实施时删除。
- [x] 0.5 审计全部 current dependency edges，确认两个 repository-quality identities 上的 typecheck/lint/Test Evidence edges 只用于排序、不传 data 且不是 scan precondition；目标 `repository-quality` 不保留 dependencies，其余目标 Checks 原本无 edge。
- [x] 0.6 记录 readiness candidate receipt、installed entry 与 input fingerprint，并固定失效规则：只有 `preparePackageCandidate()` 重新检查 fingerprint、tarball、staging、installation 和 resolved entry 后返回 `reused: true` 才可复用，否则重建；最终 handoff 使用实施结束时 identity。

## Implementation

- [x] 1.1 为 Product/scripts typecheck、lint 和 workspace format 提取 import-safe typed operations；operations 接收显式 scope/options 且不读取 argv、写 console、设置 exit code 或自行 prepare candidate。
- [x] 1.2 让 retained development CLIs 只解析 argv、调用对应 operation 并映射 stdout/stderr/exit；保持 root workflow names、pinned toolchain 与 focused CLI tests。
- [x] 1.3 为 docs JSON、schema、examples 和 links validation 提取 import-safe operations；让 docs/root validate CLIs 只负责 task selection 与边界映射。
- [x] 1.4 让 Decision Records Check 直接调用现有 `validateDecisionRecords()`，让 Test Evidence Check 直接调用 `checkTestEvidence()`，并为 ast-grep rule acceptance 提取 import-safe operation。
- [x] 1.5 将 command-only `PROJECT_GATE_CATALOG` 替换为 project-private ordinary `Check` entries；entry 只拥有 `check`、profiles 和 tags，不复制 Check identity/options/dependencies/execution。
- [x] 1.6 从同一 normalized selection 与 entry collection 投影 eligibility-wrapped Definition 和 aggregate eligible IDs；保留 raw excluded N/A facts、fail-closed flags 与静态 dependency closure。
- [x] 1.6.1 将无参 adapter 和 `verify:vibe-check-workspace` 从实施前的 default full 改为 required；保留 `:required` / `:full` 与显式 `--profile`，并更新 root/controls tests 和稳定 Script Tooling owner。
- [x] 1.7 将 `quality-quick-check` 和 `quality-full-check` 合并为 required/full 共用的 `repository-quality`；让它消费 adapter 已准备并验证的 exact candidate scan path，不再次运行 quality prepare workflow。
- [x] 1.8 删除独立 `product-tests` Gate identity；保持 Test Evidence 的完整 `scripts/**` 和 `src/product/**` Bun surface 为唯一 Product test 事实。
- [x] 1.9 删除 full-only Foundation typecheck、lint、format 和 tests identities；删除 Foundation `package.json`、专用 tsconfig、pnpm workspace/lock importer、四个 development CLI scope branches和 `foundationFormatTargets`，重写 Foundation README 为普通 scripts source 说明；确认 source type/lint/format/tests 分别由 `typecheck-scripts`、`lint-scripts`、`format-check`、`test-evidence` 接管。
- [x] 1.10 删除 `20 / 14 / 19` 与任何替代数量锁；用 explicit identity sets、profile membership、dependency closure 和 assurance mapping tests 承接完整性。
- [x] 1.11 收敛 project-private process helper，使 external tools 和 exact consumer processes 共享 signal-aware spawn、safe transcript、failure Record、terminal message 与 unavailable mapping；pure native Checks 不创建 transcript，历史 Foundation package cwd 不再作为保留 process 的理由。
- [x] 1.12 更新 Project Gate、native operations、process boundaries、eligibility、aggregation、candidate identity 和 CLI adapters 的 targeted tests；按实际 test 正文变化同步 semantic Cases 与 Owner/Proves。
- [x] 1.13 更新 `docs/script-tooling.md` 及直接相关 owner，记录 current ordinary/native/process Gate、required/full 当前 14/14 membership、Foundation ordinary workspace assurance、单次 candidate preparation 和 retained CLI 边界。
- [x] 1.14 完成零-caller wrapper/reference cleanup，并用路径过滤 caller search 确认 Foundation package envelope 无残留引用、Gate 不再调用 retained development/docs/governance/quality CLI adapters；保留 root/focused adapters 的独立 callers 必须仍可追溯。

## Verification

- [x] 2.1 运行 Project Gate catalog/selection、bound Definition/Run、native operation、process helper、candidate preparation 和 retained CLI 最窄 tests，确认 success/failure/cancel/N/A/invalid-control 分支。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`，确认 current Bun test entities、Case owners 和 Proves 完整闭合。
- [x] 2.3 运行 docs validation、Product/scripts typecheck 与 lint、workspace format check、`pnpm install --frozen-lockfile`、Git diff whitespace 和 package API documentation projection check；通过普通 workspace checks 与 Test Evidence 确认 Foundation coverage，不再把 removed package scripts 作为 Gate 验收入口。
- [x] 2.4 从无参 adapter、三个正式 roots 和显式 `--profile` 运行 selection acceptance，证明默认/`:required` 选择 required、`:full` 选择 full，并证明当前两者可同集而 selection 语义仍明确；另运行至少一个 profile-excluded smoke 和一个 tag-disabled local smoke，确认 aggregate 只消费 eligible IDs 且 excluded raw facts 保留。
- [x] 2.5 验证每次 Gate invocation 只 prepare 一次 candidate，private consumer 解析的 installed entry 匹配 receipt；quality root 独立调用仍完成自己的 prepare-and-run workflow。
- [x] 2.6 Fresh prepare documentation-complete exact candidate，并复核 receipt、tar digest、public inventory、README/declaration projection 与 isolated Bun consumer；不得复用失效 handoff 的旧 artifact 身份。
- [x] 2.7 运行 `bun run verify:vibe-check-workspace:required` 和 `bun run verify:vibe-check-workspace:full`，确认正式 roots、progress、process transcripts、package aggregate 与 adapter `0/1/2` closure。
- [x] 2.8 写出 `gate-optimization-handoff.md`，绑定 current assurance mapping、required/full identity sets、CLI/capability caller audit、formal bindings、matching candidate 与全部验证证据，并列明 publish 仍未授权。
- [x] 2.9 运行 `bun run change-plan -- check changes/align-project-gate-with-native-check-authoring`、`bun run validate -- docs` 与适用 workspace checks；逐项复核 Success Criteria 和全部 checkbox 证据后再请求归档授权。
