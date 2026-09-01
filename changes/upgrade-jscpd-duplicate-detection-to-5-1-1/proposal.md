# Proposal

把 repository jscpd baseline 和发布 package 的兼容下界从 5.0.11 提升到 5.1.1，排除已知 wrapper/engine
错配的 5.1.0，并用 actual binary evidence 证明升级可用。上游 clone baseline 同期做受控评估，但不在本 Change
中改变 `duplicateDetection` 的产品结算语义。

## Why

仓库当前精确安装 jscpd 5.0.11，发布 candidate 声明 `^5.0.11`。jscpd 5.1.x 增加 clone baseline、
`--fail-on-new-clones`、Windows ARM package 和报告增强，但 5.1.0 npm wrapper 实际执行的是 5.0.16 engine；
5.1.1 修复了这项 package/engine skew。只更新 manifest 或 lockfile 不能证明 Product 实际执行 5.1.1，也无法证明
optional platform binary、JSON/path contract、Markdown scanning 和 raw-cache provenance 仍可信。

形成时调查及版本证据边界见
[`assess-scc-and-jscpd-upgrade-readiness`](../../docs/investigations/assess-scc-and-jscpd-upgrade-readiness.md)。当前版本政策由
[`treat-jscpd-version-as-adapter-provenance`](../../docs/decisions/treat-jscpd-version-as-adapter-provenance.md)持有：
repository 固定已验证 baseline，发布 package 接受从该 baseline 开始的同 major v5，actual version 进入 availability、
cache provenance 和诊断，而不是成为 consumer policy。

## Outcome

repository dependency 与 lockfile 精确解析 jscpd 5.1.1，发布 candidate range 提升为 `^5.1.1`。candidate 和
external consumer evidence 同时证明 resolved manifest、declared bin target 与实际 `cpd`/`jscpd --version` engine
一致为 5.1.1，并证明现有 exact-input、private config、JSON report、cache 和 finding conversion contract 未回归。

同时形成一份 Change-owned clone-baseline evaluation：比较 5.1.1 checked-in baseline/JSON `isNew` 与仓库历史上已删除的
manual reference comparison，但不把 `--fail-on-new-clones`、`--baseline-from-ref` 或新旧 clone settlement 接入 production。

## Scope

### Intended Change

- 将 root `jscpd` dependency 和 lockfile 从 5.0.11 更新到 5.1.1，将 candidate dependency lower bound 从
  `^5.0.11` 更新到 `^5.1.1`，继续限定在 major v5。
- 对 package manifest、bin target 与实际启动 engine 做三点一致性验证，避免重现 5.1.0 wrapper 声明 5.1.x、实际执行
  5.0.x 的问题；验证 5.1.1 声明的七个 optional platform packages，并区分可运行平台证据与静态 manifest 证据。
- 以 representative corpus 对比 5.0.11 与 5.1.1 的 Markdown prose、multi-root、CRLF/LF、report path、JSON required
  fields、additive `isNew`、exact-scope reconciliation、Records 与 findings。
- 保持 adapter-owned project-external temporary config、absolute exact paths、JSON reporter、automatic worker policy、
  executable-only custom command 和 non-zero/malformed fail-closed behavior。
- 维护 package/candidate tests、consumer evidence、scanner/cache tests、用户文档、Test Evidence 与 active version Decision；
  actual version 继续区分 cache identity，只有 adapter config semantics 真正变化时才 bump raw-scan config version。
- 在 implementation evidence 中评估 5.1.1 checked-in clone baseline：与历史 `path:startLine` manual algorithm 比较，并用
  line insertion、line-ending、rename/move、content change、repeated clones、cross-area threshold 和 version-change fixtures
  记录 `isNew` 的稳定性和局限。

### Resulting Impacts

- 新安装的发布 candidate 不再接受 5.0.11—5.1.0 作为 package-provided dependency resolution，避免落入已知 5.1.0
  wrapper skew；runtime 对显式 custom executable 仍只要求可识别的 v5 provenance，不新增 exact runtime rejection。
- repository raw cache 会因 actual tool version 变化自然分区；当前 measurement/finding policy 仍对全部受信 duplicate
  fragments 结算，不因上游 `isNew` 自动抑制既有 clone。
- optional platform matrix 增加 Windows ARM；当前运行平台之外只可交付 manifest/static evidence，不声称已实际执行。

本 Change 不公开 jscpd args、workers、baseline path、Git ref 或 reporter，不建立通用 scanner abstraction，不启用
`--fail-on-new-clones` 或 `--baseline-from-ref`，也不恢复历史 reference runtime。若 baseline evaluation 支持“只阻止新增
重复”，必须另行形成/演进 Decision 和后续 Change，明确 Record 保留、findingPolicy、exact-input、Git/worktree resource、
baseline ownership 与迁移规则。

## Success Criteria

- root dependency/lockfile 精确为 5.1.1，candidate manifest range 为 `^5.1.1`，package/version tests 拒绝 5.1.0 并接受
  合法的后续 v5。
- repository、candidate 与 installed external consumer 均证明 resolved jscpd manifest version、bin path 和实际 engine
  version 为 5.1.1；不得只凭 package.json 宣称升级完成。
- 七个 optional platform package 的名称、version、bin mapping 与 availability 行为有静态矩阵；当前可执行平台完成真实
  invocation，其它平台明确标为未运行。
- 5.0.11/5.1.1 differential 无未解释的 JSON/path/Markdown/exact-scope/Record/finding regression；additive `isNew`
  不破坏 strict required-field parsing，也不进入 production settlement。
- cache hit/miss 证明 actual version 已隔离旧 raw measurement；没有 evidence 时不机械改变 raw-scan config version。
- baseline evaluation artifact 可独立复核 upstream `isNew` 与历史 manual algorithm 的一致/不一致场景，并明确是否建议
  后续产品 Change；production invocation 不包含 baseline 或 new-clone fail flag。
- 最窄测试、Test Evidence、typecheck、lint、dependency/package checks、candidate/consumer evidence、required 与 full Project
  Gate 通过，相关 docs、Decision 与 Change 检查闭合。

## Affected Owners

- `package.json` 与 `pnpm-lock.yaml`
- `src/package-checks/duplicate-detection/**`
- `scripts/package/**`
- `docs/checks/duplicate-detection.md`
- `docs/scanner-dependencies.md`
- `docs/testing/cases/check-owned-scanners.md`
- `docs/decisions/treat-jscpd-version-as-adapter-provenance.md`
- `changes/upgrade-jscpd-duplicate-detection-to-5-1-1/baseline-evaluation.md`（实施时形成）
