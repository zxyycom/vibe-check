# Tasks

按“先证明 measurement migration，再切换 backend，最后闭合 consumer 与 Gate evidence”的顺序实施；不得先改版本号再追认数值变化。

## Readiness

- [x] 0.1 已审计形成时调查、当前 SCC 3.7.0 pin、file-metrics adapter/public boundary、environment binding 与相关 active Decision。
- [x] 0.2 已固定 SCC 4.0.0 `/v4`、Go 1.26.4、exact version、ambient config isolation、evidence-driven private config、无 fallback 与不扩大 public surface 的 Plan 边界。
- [ ] 0.3 实施前取得明确授权，重新核对 official v4 release/toolchain/config precedence，并准备能并行运行 3.7.0 与 4.0.0 的 representative differential corpus 和 clean-install baseline。

## Implementation

- [ ] 1.1 建立 checked-in 多语言/路径/异常语料和 machine-readable 双版本 observation，分类 CSV、Provider/path、Code、Complexity、Record 与 finding 的每项差异，并据此决定是否需要最小 Product-owned private config。
- [ ] 1.2 将 mise、Go/tool lock、environment resolver、SCC availability/scanner/parser 与 cache/backend identity 一次切换到 4.0.0 `/v4`，固定 `--no-config`、exact inputs 和已证明的 CLI/private-config protocol，且不保留 v3 fallback。
- [ ] 1.3 同步 public/internal types、安装与 migration docs、scanner dependency owner、package/Gate materials、相关 active Decision 和 Test Evidence ledger；只有产品证据支持时才调整 threshold expectation。

## Verification

- [ ] 2.1 运行 file-metrics constructor、availability、scanner、parser、measurement、scope、finding/Record 与 cache 最窄测试，并闭合所有新增、修改、删除或重命名 test nodes 的 Case evidence。
- [ ] 2.2 在 clean project environment、repository dogfood 和 installed candidate/consumer 中验证 actual SCC 4.0.0 `/v4`、Go 1.26.4、Windows/Unix path、ambient config isolation、optional private config precedence、timeout/cancellation 与完整 fail-closed output。
- [ ] 2.3 运行 typecheck、lint、dependency/environment checks、docs/Decision/Change checks、required 与 full Project Gate，复核 differential ledger 无未分类漂移、custom 3.7.0 migration 已说明、无 v3 runtime path 或 stale cache hit 后交付。
