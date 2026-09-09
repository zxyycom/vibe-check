# Tasks

先锁定现有 dependency 与 type evidence，再实现 marker、private lifecycle 和 provider-aware read，最后闭合公开材料与 package acceptance。

## Readiness

- [ ] 0.1 运行 `bun run test-evidence -- check --root .`，查询 typed provider、direct dependency、Core publication 与 installed declaration 的当前 Cases，并确定新增证据的 owner。
- [ ] 0.2 核对 `Check`/`CheckResult` generics、`defineCheck` overload、Definition normalization、settlement 与 dependency reader 调用链，固定 provider-object read 的 closed success/error union 和 string/list 兼容边界。

## Implementation

- [ ] 1.1 增加 branded `defineCheckHandoff<T extends object>()` 与 supporting types，连接 provider authoring、`passed` result 和 dependency read，并用 compile-time tests 覆盖合法组合、缺失、多余与类型不匹配。
- [ ] 1.2 扩展 Definition runtime validation 与 normalization，只保留 genuine executable marker，并证明 declarative snapshot 和 fingerprint 不受 marker/generic identity 影响。
- [ ] 1.3 在 check-execution owner 实现 settlement-gated private store 与 provider-aware `dependencies.get(provider)`，覆盖 strict identity、fan-out、各终态、malformed result、cancellation、relation authorization 与 repeated-Run isolation。
- [ ] 1.4 增加 Core snapshot、RunResult、machine v4、diagnostics、progress、string `get`、`list`、aggregation 和 cache 的 handoff-absence/compatibility 回归，保持现有 schema 和 example shape。
- [ ] 1.5 更新 public/internal documentation owners、package-root JSDoc/exports 和 changelog，用 `Map` 加文件字节 snapshot 解释 no-parser、non-persistent 与 producer-owned immutability contract。
- [ ] 1.6 同步 Semantic Cases、package API projection/material audit 和 installed-consumer fixture，证明 package-root consumer 可推断精确类型并读取同一引用。

## Verification

- [ ] 2.1 运行 authoring type tests、Definition validation/fingerprint tests、dependency execution tests、settlement misuse tests 与 publication-absence tests。
- [ ] 2.2 运行 Test Evidence、docs、package API documentation/material、Product typecheck、lint、dependency/import-boundary 和默认 `bun run check`。
- [ ] 2.3 运行 `bun run check -- --all`，验证 candidate artifact、published declarations/docs 和 installed Node consumer 的类型、identity 与 publication absence。
