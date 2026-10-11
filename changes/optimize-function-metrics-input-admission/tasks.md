# Tasks

先冻结 timer 基线和 exact 输入，再替换默认 helper，按行为及完整 Check 证据决定采用。

## Readiness

- [x] 0.1 已核对 measurement/Worker/Check 责任、现有 timer 事实和局部性能/取消证据边界。
- [x] 0.2 已选逐非空 32 KiB chunk setImmediate，保持 checkpoint/频率/资源/清理，不删除或稀疏 yield、不增公共抽象。
- [x] 0.3 已固定真实/压力 corpus、支持 Node 完整 Check 生产默认对照、取消观察与采用/不采用标准，独立于升级/修复。
- [x] 0.4 已完成非实施代理的独立准备度审计：范围、采用条件及必要影响可直接推进，无未决阻断。

## Implementation

- [x] 1.1 冻结 timer 基线、真实 src 输入 manifest/hash、200 短文件和 4 MiB 压力形态、公开 Check 输出及 runtime/候选身份；建立设计约定的完整 Check 对照，不用 controlled port 代替。
- [x] 1.2 仅把私有生产 yield helper 替换为 setImmediate Promise，保留全部频率/checkpoints/actual byte checks/decode/Worker 生命周期。
- [x] 1.3 按取消表和输入/失败矩阵补默认路径、rejection 保留、跨文件、FD/listener/terminate 直接证据；复用既有 Case 目的，不能用微任务注入证明默认行为。
- [x] 1.4 以 before/after exact candidates 完成支持 Node 的 15-block ABBA 完整 Check 对照，记录语义等价/median/p95/噪声及采用结论；失败保留 timer 基线，禁止转用未授权策略。
- [x] 1.5 达到采用条件后同步内部说明/changelog 和实际受影响 owner；只在真实公开变化时改指南，不新增硬响应承诺。

## Verification

- [x] 2.1 跑 measurement.resource/encoding、Worker 和 constructor 最窄测试，再覆盖整个 function-metrics；验证 exact 8/64 MiB、+1 及完整失败，不发布前缀。
- [x] 2.2 证明预先/读取中 timer 和 I/O/跨文件/Worker 在途取消、rejection 保留、无伪造 waiver、FD 关闭/listener 移除/terminate 一次；默认与注入证据边界分别记录。
- [x] 2.3 Node 真实 Check 生产默认的全 Records/outcome 等价与采用标准通过；Bun 或 Node 源树 prototype 差异单列，不掩盖候选回归或外推 Gate 加速。
- [x] 2.4 运行 typecheck/lint、validate、test-evidence、decisions check、change-plan check 和 git diff --check；独立审查最终 diff 只改选定 owner 与必要证据。
- [x] 2.5 经公共 package 入口验收 exact artifact、installed Node consumer 的真实 Worker/默认 helper 和资源/结果，再运行 `mise exec -- bun run check -- --all`。

## Delivery Evidence

本项采用与验收逐项依据保存在[正式实施调查](../../docs/investigations/verify-function-metrics-admission-implementation.md)：
冻结timer基线与601-file union；唯一helper改动；默认/私有取消、FD与Worker证据；初步及最终各180样本完整Node ABBA；
最终精确候选 `0.0.0-local.f83e9a2caff6`、113 tests、702 entities / 176 Cases，以及完整Gate 43/43、exit0。
稳定owner/changelog与当前协调已交接；Git提交及finalize由root另行完成，不由checkbox证明。
