# Proposal

以完整 source-aligned dependency closure 的 Product-owned TypeScript analyzer 替换 `functionMetrics` 的 Python/Lizard runtime，并在同一次 hard cut 中移除外部 backend 与公开 executable 配置。

## Why

本 Change 的实施前基线中，`functionMetrics` 依赖 Python、Lizard command 与 CSV adapter；Bun consumer 必须满足外部运行时前提，且公开的 `scanner.executable` 只配置这条路径。当前 source tree、candidate/installed consumer 与 workspace required/full Gate 已共同验证内置 TypeScript analyzer 切换和 public option 删除。Change 仍保持 active 仅因归档需要单独的明确授权；这不等同于已发布版本。

产品 owner 已确认承担完整语言面与后续同步成本，因此不采用仅覆盖常见语言的局部实现、长期 dual backend 或自行优化上游语义的替代路径。

## Outcome

本 Change 的验收结果是：`functionMetrics` 在正式 Product 与已安装 package 中完全由仓库拥有的 TypeScript analyzers 提供 Lizard 1.23.0 的 27 readers / 55 extensions 函数测量兼容面；Python、Lizard、CSV 和 `scanner.executable` 均不再是产品运行时或 public contract。仓库另有显式启用、非阻断的 upstream advisory，提示 Lizard stable release；后续采用仍经独立 Change。

## Scope

### Intended Change

- 固定 Lizard 1.23.0 为首轮 oracle；忠实翻译完整 internal extension protocol、core processor lifecycle 与 shared reader dependency，再按 reader/family 完成 source-fidelity review。保留已观察到的函数 identity/range、NLOC、CCN、parameters 与顺序语义；语言、Bun、类型、资源或安全所必需的差异逐项记录并证明，parity 闭合前不主动优化语义。
- 完整 internal extension protocol（discovery/order/metadata/processor lifecycle）属于 analyzer dependency closure。19 个列明的 optional concrete extension body 为 `deferred-extension-body`，默认不注册、不启用且不形成首轮测量承诺；外围 CLI/file walk/output/CSV/version surfaces 仅按 ledger 的明确 range `excluded-entry-surface`。Product adapter 继续拥有 exact-path read、settlement、cancellation 与 error mapping。
- 一次 hard cut 移除 Lizard availability/probe/process/parser/CSV、Python/Lizard package prerequisite、tool binding、production fallback 和 `scanner.executable`；不设 deprecation、shim、feature flag 或 dual backend。source-tree、candidate/installed consumer 与 workspace Gate 已验证同一 hard cut，而不是再次设计 backend。
- 为翻译或衍生文件建立 file-level provenance，并将适用 header、notice、完整许可与 attribution 放入独立 package legal inventory，而非 README 或 Check guide 主叙事。
- 建立 repository-owned upstream advisory：仅由专用 maintenance invocation 显式启用，查询固定官方 HTTPS release source；结果只提示，不自动升级，也不影响默认 required/full Gate。

### Resulting Impacts

- Product 直接拥有完整 reader compatibility surface；上游新版本由 advisory 发现，但 reader、extension、修复、provenance 与 corpus 的采用必须通过独立 Change。
- external-process/CSV 专属失败与 executable configuration 消失；unsupported input、read failure、cancellation、Finding waiver 与 Check-level failure 继续遵循 owner 的 fail-closed contract。
- `scanner.executable` 的 hard cut 影响显式 consumer，需由 public types、runtime validation、examples/docs、release migration、candidate 和 installed-package acceptance 一起证明。
- 忠实翻译可能同时携带 MIT 与 Apache-2.0 provenance；root MIT、manifest expression、`THIRD_PARTY_NOTICES.md`、`licenses/**` 和 shipped source inventory 必须由 ledger 一致驱动。
- 当前 `functionMetrics` 没有 owner-local persistent cache；本 Change 不新增 cache 或 backend-identity migration，也不修改 SCC/fileMetrics、metrics、language range 或 syntax-validity public contract。

## Success Criteria

- 每个 in-range source/range 可追溯到 target 或明确 excluded-entry-surface；internal extension protocol 有完整 lifecycle evidence，19 个 deferred concrete extension body 明确未注册。reader 启用前完成 normal、edge 与 failure-oriented fidelity review，别名 extension 同时证明 selection 与共享语义。
- 固定 corpus 证明 approved exact inputs 的 function identity/range、NLOC、CCN、parameters、Records/order、Finding waiver identity/reconciliation/audit、final data、area fan-out、no-input、unsupported-input、read-error 与 cancellation contract 保持兼容。
- Malformed-source fixtures 证明 analyzer 不崩溃、不越界并产生可审阅的 Lizard-compatible observation；它们不把 27 种语言的完整 syntax validity 变成新的 public contract，malformed protocol/input 与 owner boundary 仍 fail closed。
- 代表性和 adversarial fixtures 对单文件/总输入、复杂度、取消响应、timeout/termination 与异常资源消耗提供直接证据；`functionMetrics` 只读取 callback 已批准的 exact paths，绝不重新收集 project root。
- import/process/dependency checks、candidate 和 installed consumer 证明无 Python/Lizard probe、exec、CSV、fallback 或 package prerequisite；不存在替代性的 public backend/parser knob。
- advisory 的显式授权、fixed target、bounded transport、new-version/no-update/network-failure 语义及默认 Gate absence 均有测试；网络失败不伪造“无更新”。
- source/range provenance、deviation、headers、legal inventory、Test Evidence closure、目标测试与 source-quality checks 已有直接证据；workspace required/full Gate 与三条 Decision owner alignment 已在本 Change 的 verification task 中闭合。每次 Gate 的候选标识只是该次审计证据，不是稳定版本或发布政策。

## Affected Owners

- `src/package-checks/function-metrics/**` 及其 tests：analyzers、measurement model、options、execution、Records、waivers、resource/cancellation boundary。
- `docs/checks/function-metrics.md`、`docs/scanner-dependencies.md`、`docs/scan-scope.md`：当前语言范围、backend、failure、Finding waiver 和 public migration。
- Project Definition、repository maintenance advisory、network transport tests、candidate/installed-consumer、dependency/import/process trace、`mise.toml` 与 release materials。
- Package `LICENSE`、`THIRD_PARTY_NOTICES.md`、`licenses/**`、manifest/artifact inventory 与 provenance ledger。
- `docs/testing/cases/**` 及直接受影响的 Decisions：parity/failure/absence/upstream evidence、Lizard protocol、supported language 与 license responsibility。
