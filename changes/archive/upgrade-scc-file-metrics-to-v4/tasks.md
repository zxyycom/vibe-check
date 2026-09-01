# Tasks

按“先证明 measurement migration，再切换 backend，最后闭合 consumer 与 Gate evidence”的顺序实施；不得先改版本号再追认数值变化。

## Readiness

- [x] 0.1 已审计形成时调查、本 Change 形成时的 SCC 3.7.0 pin、file-metrics adapter/public boundary、environment binding 与相关 active Decision。
- [x] 0.2 已固定 SCC 4.0.0 `/v4`、Go 1.26.4、exact version、ambient config isolation、evidence-driven private config、无 fallback 与不扩大 public surface 的 Plan 边界。
- [x] 0.3 实施前取得明确授权，重新核对 official v4 release/toolchain/config precedence，并准备能并行运行 3.7.0 与 4.0.0 的 representative differential corpus 和 clean-install baseline。

## Implementation

- [x] 1.1 建立 checked-in 多语言/路径/异常语料和 machine-readable 双版本 observation，分类 CSV、Provider/path、Code、Complexity、Record 与 finding 的每项差异，并据此决定是否需要最小 Product-owned private config。
- [x] 1.2 将 mise、Go/tool lock、environment resolver、SCC availability/scanner/parser 与 cache/backend identity 一次切换到 4.0.0 `/v4`，固定 `--no-config`、exact inputs 和已证明的 CLI/private-config protocol，且不保留 v3 fallback。
- [x] 1.3 同步 public/internal types、安装与 migration docs、scanner dependency owner、package/Gate materials、相关 active Decision 和 Test Evidence ledger；证据确认 threshold expectation 保持不变，仍为非阻断观测策略。

## Verification

- [x] 2.1 运行 file-metrics constructor、availability、scanner、parser、measurement、scope、finding/Record 与 cache 最窄测试，并闭合所有新增、修改、删除或重命名 test nodes 的 Case evidence。
- [x] 2.2 在 clean project environment、repository dogfood 和 installed candidate/consumer 中验证 actual SCC 4.0.0 `/v4`、Go 1.26.4、ambient config isolation、timeout/cancellation 与完整 fail-closed output；Linux 是实际安装/执行环境，Windows/Unix path 只由静态路径边界测试证明，未进行 Windows 实机验收；未采用 private config，因此没有 private-config precedence claim。
- [x] 2.3 运行 typecheck、lint、dependency/environment checks、docs/Decision/Change checks、required 与 full Project Gate，复核 differential ledger 无未分类漂移、custom 3.7.0 migration 已说明、无 v3 runtime path 或 stale cache hit 后交付。
