执行约束：sections 必须顺序执行。Translation 前完成 pinned source/license/closure
baseline；切换 adapter 或删除旧路径前完成 differential parity。只有 implementation 与指定
证据都存在时才勾选任务。修改测试正文或实体时，同时执行当前 test-evidence review/check
workflow。

## 0. Current-Contract Audit

- [x] 0.1 确认已归档 product-source promotion、当前 `.ts` / `.d.ts` / `.rs` selector、
  当前 `FunctionMetric` fields、complete-config coupling 与 capability-level failure。
- [x] 0.2 删除 stale four-language、token/kind、per-file partial 和 generic
  scanner-backend obligations；只把它们作为有独立 trigger 的未来 change。

## 1. Pin the Migration Baseline

- [ ] 1.1 固定 Lizard 1.23.0 与 commit
  `06284ec87c1966fee4ddbf3f068ccf89b987b0f8`；记录 source archive integrity 与适用
  license treatment，不把 secret 或未核实 source 写入仓库。
- [ ] 1.2 计算 current TypeScript/Rust readers 的实际 upstream import/call closure，并在
  translation 前更新 candidate source map。
- [ ] 1.3 把每个 included upstream responsibility 映射到 upstream tests、known skips 与
  target TypeScript tests。
- [ ] 1.4 保存 deterministic `.ts`、`.d.ts`、`.rs` corpora 的当前 Python/Lizard results，
  覆盖 function inventory、normalized fields/order、zero-function input 与 controlled
  failures。
- [ ] 1.5 保存当前 config、tool metadata、cache/scanner identity、warnings、aggregates、
  gate、human 与 machine projection baselines。

## 2. Translate the Verified Source Closure

- [ ] 2.1 从 `lizard.py` 翻译 required analysis model、builders 与 pipeline。
- [ ] 2.2 从 `code_reader.py` 翻译 required reader/token/state base，并增加 focused tests。
- [ ] 2.3 只翻译 task 1.2 证明可达的 shared C-like/script/regex helpers。
- [ ] 2.4 翻译 `.ts` / `.d.ts` TypeScript reader 与 mapped tests。
- [ ] 2.5 翻译 `.rs` Rust reader 与 mapped tests。
- [ ] 2.6 为 verified closure 实际使用的 Python-to-TypeScript generator、collection 与
  RegExp adaptations 增加最小 parity tests。
- [ ] 2.7 为每个 translated file 记录 pinned revision/license/source path 与 owning tests。
- [ ] 2.8 运行 translated core/reader tests、product typecheck 与 lint；integration 前清除
  所有未解释差异。

## 3. Prove Product Parity

- [ ] 3.1 对完整 two-language corpus 逐项比较 function inventory、name、file、
  start/end line、lines、parameter count、cyclomatic-complexity value/source 与
  deterministic order。
- [ ] 3.2 证明信任 port 所需的 internal tokenizer/state invariants，但不把 token count、
  kind、long name 或 parser internals 提升为 `FunctionMetric`。
- [ ] 3.3 证明 zero-function success 与现有 unavailable/execution/invalid-result failure
  distinctions；任一 file/parse/invariant failure 都保持 capability-level，绝不成为成功
  partial output。

## 4. Hard-Cut the Product Runtime

- [ ] 4.1 定义一个 internal typed analyze API，并让 current/baseline function-metrics
  adapter 调用。
- [ ] 4.2 保持 exact input selection、file/path/UTF-8 handling、normalization、code-area
  mapping、changed-scope marking 与 ordering。
- [ ] 4.3 对 switched adapter 重放 structural、completeness、warning、aggregate、gate、
  human 与 machine regression tests。
- [ ] 4.4 用 pinned upstream 加 port revision 更新 product tool metadata 与 cache/scanner
  identity，并重放既有 incompatible-cache/baseline behavior。
- [ ] 4.5 从 `QualityConfig`、default config、strict parser、environment overrides、
  canonical external fixture、tests 与 owner docs 删除 `tools.lizard`；保留 top-level
  `config.lizard` thresholds 与公开 `"lizard"` source labels。
- [ ] 4.6 证明 formal current/baseline scans 不解析或启动 Python/Lizard。
- [ ] 4.7 删除 production availability、command/args、process wrapper、CSV parser 与
  obsolete protocol tests；migration-only oracle material 不进入 required runtime。
- [ ] 4.8 更新所有 changed/new test entities 的 semantic Cases，并证明完整当前 closure。

## 5. Delivery Verification

- [ ] 5.1 运行 affected translated/adapter/config/product tests，再运行 product typecheck 与
  lint。
- [ ] 5.2 运行真实 `.ts`、`.d.ts`、`.rs` scans，并与 task 1 baselines 比较 metrics、
  warnings、aggregates、gate、human 与 machine results。
- [ ] 5.3 搜索 production imports、config fields、environment variables、commands 和 process
  calls，证明没有 Python/Lizard runtime 或 CSV path。
- [ ] 5.4 运行完整 test-evidence strict check，确认 source/test traceability 完整。
- [ ] 5.5 运行 `bun run validate` 与
  `bun run verify:vibe-check-workspace:required`。
- [ ] 5.6 运行 OpenSpec strict validation、`git diff --check` 与 focused
  diff/keyword audit；汇总 source map、license、differential、config hard cut 与 runtime
  removal evidence。
