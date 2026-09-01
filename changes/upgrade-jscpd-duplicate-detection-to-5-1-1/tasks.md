# Tasks

先证明 package wrapper、actual engine、scanner output 和 platform matrix，再更新 dependency baseline；clone baseline 只形成实验结论，不进入 production settlement。

## Readiness

- [x] 0.1 已审计形成时调查、5.0.11 repository/package contract、5.1.0 wrapper/engine skew、current jscpd adapter/cache boundary 和 active provenance Decision。
- [x] 0.2 已固定 exact target 5.1.1、candidate lower bound `^5.1.1`、manifest/bin/engine 三点验证、七项 optional package matrix、bounded clone-baseline evaluation 与不改变 product settlement 的边界。
- [ ] 0.3 实施前取得明确授权，重新核对 5.1.1 official package/engine/baseline behavior 和 current owners，并冻结 5.0.11/5.1.1 differential、platform matrix 与 installed consumer baseline。

## Implementation

- [ ] 1.1 建立 Markdown/path/line-ending/scope/JSON corpus，执行 5.0.11/5.1.1 scanner differential，并形成 `baseline-evaluation.md`，对比 upstream checked-in `isNew` 与历史 `path:startLine` algorithm 的既定 rename/edit/repetition/version cases。
- [ ] 1.2 将 root dependency、lockfile 与 candidate range 更新到 5.1.1/`^5.1.1`，维护 adapter/parser/cache identity 仅限 evidence 要求的差异，并保持 private exact-path config、automatic workers、non-zero fail-closed 与无 production baseline flags。
- [ ] 1.3 同步 package/candidate/external-consumer tests、optional platform matrix、duplicate-detection/scanner docs、active provenance Decision、migration note 和 Test Evidence ledger；baseline capability 建议只指向独立后续 Decision/Change。

## Verification

- [ ] 2.1 运行 jscpd command resolution、availability、scanner、JSON parser、scope reconciliation、measurement/finding/Record 与 cache 最窄测试，并闭合所有新增、修改、删除或重命名 test nodes 的 Case evidence。
- [ ] 2.2 在 repository、candidate 和 installed external consumer 中验证 resolved manifest、package-local bin 与 actual engine 均为 5.1.1，检查七项 optional packages、current-host real scan、其它平台 static evidence、Markdown/path/JSON/cache behavior 和 5.1.0 rejection。
- [ ] 2.3 运行 typecheck、lint、dependency/package checks、docs/Decision/Change checks、required 与 full Project Gate，复核无 5.0.11/5.1.0 default runtime path、无未解释 scanner drift、无 production baseline/new-clone flag 后交付。
