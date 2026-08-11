# Proposal

本 Change 计划在三个 Check foundations 落地后，以 fresh compatibility baseline 将 `function-metrics` built-in Check 的 Python/Lizard backend替换为 Product-owned TypeScript implementation；在进入 implementation 前，proposal仍可随同一目标的事实核对而修订。

## Why

当前 formal function measurement path需要发现/启动Python与Lizard、解析Lizard 1.23 CSV，并维护额外availability、process和private protocol failure。统一到Product-owned TypeScript runtime可以减少安装与执行依赖，但必须在Check/Record、Task orchestration和Project Definition稳定seam上迁移，避免把旧capability/config/output形状误当成新产品contract。

## Outcome

`function-metrics` Check只对届时 Scan Scope owner 批准并交付的 exact inputs（下称 approved exact inputs）调用Product-owned TypeScript structural-analysis backend；formal product runtime不再探测、启动或解析Python/Lizard。Backend经exact-input analysis和canonical normalization产生届时Check owner要求的function records/results，并保持fresh baseline确认的exact-input set、stable semantic identity、measurements、ordering、zero-result、comparison和failure behavior。

## Scope

纳入范围：

- 在foundation changes落地后，从当前owners、runtime和可重复Lizard oracle采集fresh compatibility corpus/baseline；
- approved exact inputs 的Product-owned analysis、function boundaries、NLOC、parameter count、cyclomatic complexity和canonical normalization；当前范围为`.ts`（含`.d.ts`）与`.rs`，`.tsx`、`.js`、`.jsx`不因相邻语法自动纳入；
- 按private TaskPlan/execution seam处理exact inputs、partial records、CheckResult与execution failure；
- source/provenance/license审计、differential fixtures、edge/error corpus和与产品调用场景相称的performance证据；
- hard cut formal Python/Lizard dependency/availability/process/CSV path，更新scanner/metrics owners、tests、fixtures、package/runtime dependencies与dogfood。

非目标：改变`function-metrics` checkId或既定recordType identities；扩大 approved exact-input set或新增metrics/policy；建立public parser/provider API；修改Check/Record/scheduler/Project Definition contract；把Lizard保留为production fallback或双backend开关。

## Success Criteria

- 实施开始前已确认三个foundation Changes成为可依赖当前seam，并从届时owners/runtime采集versioned compatibility corpus、expectedrecords/results/failures与source/license基线。
- TypeScript backend只读取 approved exact inputs，不自行scan project root；当前范围为`.ts`（含`.d.ts`）与`.rs`，并对fresh baseline中的这些exact-input cases产生相同领域measurements、semantic identities、canonical ordering和zero-result语义。
- Parser/read/normalization failure按foundation Check execution contract报告；已可信提交records的保留、CheckResult与coverage不由backend自行重定义。
- Current与named-reference inputs使用同一backendcontract；matching/comparison和cache identity继续由producing Check及其owner控制，不把parser internals提升为public identity。
- Formal runtime、installed package和dogfood不再probe/execute Python/Lizard，也不解析Lizard CSV；production dependencies、environment overrides和diagnostics中没有active Lizard execution path。
- Differential/edge/error corpus、target tests、installed runtime、workspace/full dogfood和必要performance observation证明替换可接受；provenance/license义务已记录并满足。

## Affected Owners

- `docs/scanner-dependencies.md`：function backend、runtime dependency、exact-input handoff、failure与replacement evidence。
- Check/Record和function-metrics当前稳定owner（由`establish-check-record-core`同步后的`docs/`文档承接）：check/result/record identities、measurements、ordering、comparison与failure。
- `docs/scan-scope.md`：supported input classification和 approved exact paths；本Change只消费，不扩大。
- `src/product/**`：function-metrics private binding/TaskPlan、TypeScript structural analyzer、normalization、cache/backend identity和formal runtime dependency closure。
- `docs/testing.md`、`docs/testing/cases/**`、function fixtures/differential corpus与product/dogfood tests：parity、edge、failure、performance和dependency-removal evidence。
- Package/release materials：installed runtime dependencies、legal notices/provenance和不再需要Python/Lizard的consumer prerequisites。
