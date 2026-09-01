# Proposal

本 Change 规划以 Product-owned TypeScript function analyzers 取代 `functionMetrics` 的 Python/Lizard backend，同时保持当前 Lizard 1.23 reader 范围和 owner-level observable contract。本 Change 进入 Plan 只表示范围、设计与验收可以交接，不授权开始实现；实现仍受现有后置决定和 Readiness gate 约束。

## Why

当前 `functionMetrics` 要求 Bun/npm consumer 另外提供 Python、Lizard 及其 Python dependencies，并由 Product probe executable、启动 subprocess、解析 CSV 和映射 process failures。与已有多平台静态 binary 的 SCC 相比，Lizard 是更直接的 runtime 与分发摩擦来源。

旧 Change `port-lizard-function-metrics-to-typescript` 只规划 `.ts`、`.d.ts` 与 `.rs`，明确排除 JavaScript/JSX/TSX。当前 aligned language Decision 已把 `functionMetrics` eligibility 扩展到 Lizard 1.23 的 27 readers、55 extensions，因此旧 Change 不能继续实施。形成时依据和相对优先级见 [`compare-lizard-and-scc-typescript-port-priority.md`](../../docs/investigations/compare-lizard-and-scc-typescript-port-priority.md)。

## Outcome

`functionMetrics` 继续接受当前 registry 中的 55 个扩展名，并对 Lizard 1.23 的 27 个 reader families 保持 function identity、source range、NLOC、cyclomatic complexity、parameter count、Records/order、final data，以及适用的 unsupported-input/read/cancellation/Check-level failure semantics。其 private measurement backend 一次 hard-cut 为仓库拥有的 TypeScript implementation；formal Product 与 installed package 不再 probe/execute Python/Lizard、不再解析 Lizard CSV，也不再暴露仅用于选择 Lizard command 的 `scanner.executable` policy。

## Scope

### Intended Change

- 以 pinned Lizard `1.23.0` 建立覆盖当前 27 readers/55 extensions 的 responsibility ledger、checked-in differential corpus 和 owner-level expected observations；本 Change 不同时升级到 Lizard 1.24。
- 按实际语义共享程度实现 TypeScript analyzers：共享 exact-path read boundary、normalized candidate/result、canonical ordering、signal handling 与 error mapping；tokenization、function boundary、NLOC、CCN、parameter/name/range 等稳定语言差异留在 reader/family-local owner。
- 在写 translated/derived code 前固定 upstream revision，完成 file-level license/provenance、notice 与 package license 路径；无法证明可接受路径时只允许有可审计依据的 behavior-based implementation，否则停止。
- 全兼容 corpus 通过后一次切换 measurement callback 与 cache/backend identity，并在同一 Change 删除 Lizard availability/process/parser/CSV、Python/Lizard package prerequisite、tool binding 与 production fallback。
- 将 `scanner.executable` 的删除作为 public options/types/docs migration 处理，验证默认构造、explicit consumer、Project Definition、candidate 与 installed package。
- 复核并维护受 hard cut 影响的长期 Decisions、owner 文档和测试 Case；不把历史 Lizard adapter protocol 留作当前规范。

### Resulting Impacts

- Product 将从依赖上游 Lizard reader 修复转为直接拥有 27-reader compatibility surface；后续语言修复、性能与安全责任随之内化。
- 现有 Lizard-specific unavailable/process/CSV failures 和 public executable configuration 将消失；unsupported input、read failure、cancellation 与 Check-level failure 仍须保持 owner 定义的 fail-closed 行为。
- 旧 cache 不得命中新 backend；package、candidate、repository dogfood 与 Gate 不得再通过隐式 Python/Lizard 环境掩盖依赖残留。
- 不修改 SCC/fileMetrics，不建立 generic parser/scanner plugin framework，不新增 metric/language/public parser API，不静默收窄当前支持语言，也不保留 Lizard fallback 或 dual backend。

## Success Criteria

- 当前 registry 的每个 extension 都映射到明确 reader/family owner，且每个 reader 至少有 normal、edge 与 failure-oriented parity evidence；别名扩展必须证明共享语义而不是只证明被选中。
- 对 approved exact inputs，新 backend 在固定 corpus 中保持 function identity/range、NLOC、CCN、parameters、Records/order、final data、area fan-out、no-input、unsupported-input、read-error 与 cancellation contract。
- `functionMetrics` 只读取 callback 提供的 approved exact paths，不重新收集 project root；malformed/unsupported source 按当前 owning Check 语义 fail closed。
- Formal imports、process traces、dependency checks、candidate 与 installed consumer 均证明无 Python/Lizard probe、exec、CSV、fallback、package prerequisite 或 stale cache hit。
- Public `scanner.executable` 删除已在 types、runtime validation、examples/docs 与 migration evidence 中闭合，未引入替代性的 public backend/parser knob。
- Source/license/provenance evidence、最窄测试、Test Evidence closure、performance observation、workspace required/full Gate 与 installed Bun evidence完整。

## Affected Owners

- `docs/checks/function-metrics.md`、`docs/scanner-dependencies.md` 与 `docs/scan-scope.md`：当前语言范围、measurement backend、failure 和 public scanner migration。
- `src/package-checks/function-metrics/**`：analyzers、measurement model、options、execution、Records、cache identity 与 tests。
- Project Definition/public type acceptance、package candidate/installed-consumer、dependency/import/process trace、`mise.toml` 与 license/provenance materials。
- `docs/testing/cases/**` 与直接受影响的 Decisions：parity/failure/absence evidence，以及 Lizard protocol 和 supported-language responsibility 的当前状态。
