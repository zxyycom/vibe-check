# Design

本设计用fresh baseline约束一个private Product-owned TypeScript structural-analysis backend，并以单次hard cut替换`function-metrics`的formal Python/Lizard execution path。

## Context

当前事实由`docs/quality-metrics.md`、`docs/scanner-dependencies.md`和`src/product/quality-core/src/measurement/**/lizard*.ts`承接：function capability对`.ts`（包括`.d.ts`）与`.rs`exact inputs调用resolved Python executable和fixed `-m lizard`，解析Lizard 1.23 CSV为name/file/start/end/NLOC/parameter-count/cyclomatic-complexity，并把unavailable、execution与invalid-result分开。本设计把届时 Scan Scope owner 批准并交付的集合称为 approved exact inputs；当前集合只包括`.ts`（含`.d.ts`）与`.rs`，`.tsx`、`.js`、`.jsx`不因使用相邻语法而自动纳入。当前模型仍是旧capability/machine-v1事实，不能直接替代新Check/Recordcontract。

活动未对齐决策`defer-lizard-until-after-check-foundations`确认实施顺序和private-backend边界：先完成Check/Record Core、Task orchestration和TypeScript Project Definition，再基于届时事实重新baseline并port。该顺序不把本Change降级为占位计划；fresh baseline capture、implementation和hard cut均由下方任务定义。

## Goals / Non-Goals

**Goals**

- 用Product-owned TypeScript implementation产生function-metrics领域数据，删除formal Python/Lizard runtime prerequisite。
- 以foundation落地后的fresh public/observable behavior而非历史capability artifacts定义compatibility。
- 为 approved exact inputs 建立可追溯、可差分验证的function boundary与metric analysis。
- 保持backend private：只经owning Check binding、record sink、ack/report ports与cache identity接入产品。
- 在切换前闭合source/license、correctness、failure和performance evidence，并在切换后删除production fallback。

**Non-Goals**

- 新增 exact-input categories、metrics、record types、policy operands、public parser API或generic structural provider。
- 修改Check/Record managers、shared scheduler、Project Definition authoring或output contract。
- 追求Lizard所有language/plugin行为；只覆盖fresh approved exact inputs和Check owner确认的metrics。
- 保留production dual backend、runtime feature flag或silent fallback。
- 用line/column或parser-private node identity取代foundation的location-independent record identity。

## Decisions

### 1. Foundation落地后立即采集fresh baseline

Implementation首先确认`establish-check-record-core`、`establish-check-task-orchestration`与`adopt-typescript-project-definition`已同步到current owners/runtime。随后冻结一个versioned compatibility corpus和baseline manifest，记录：supported extensions/exact-input rules；function/record semantic identity；name与location projection；NLOC、parameter count、cyclomatic complexity；canonical ordering；zero/no-input；current/reference comparison；valid partial records；CheckResult/CheckRun failure；backend/cache identity；representative runtime cost。

Baseline由届时formal Product path对checked-in synthetic/realistic fixtures产生，并通过owner-level expected records/results表达，不把CSV bytes或历史artifact shape当作public contract。Oracle invocation只用于迁移证据，不能进入新runtime接口。

### 2. 每个 approved exact-input category 使用private analyzer，共享canonical result boundary

Backend只处理 approved exact paths和file content。当前 analyzer 边界分别为`.ts`（含`.d.ts`）与`.rs`；其它extension只有经 Scan Scope owner 明确纳入后才能进入未来baseline，不能由analyzer自行扩大。Analyzer输出一个private normalized function candidate：semantic name/subject components、current location、NLOC、parameter count与cyclomatic complexity。Shared validator拒绝invalid range/non-finite/negative values，owning Check再形成public records/results和canonical order。

Analyzer实现采用deterministic lexer/parser-state modules，只承接fresh corpus证明需要的syntax：functions/methods/closures、nested scopes、comments/strings/templates/raw strings、parameters和decision constructs。Exact-input-specific state不越过private boundary；没有可靠analysis时返回typed execution failure，不猜测function或metric。

任何translation/derivation自Lizard或其它upstream source必须在代码写入前固定revision、source responsibility、license/notice义务和可追溯差分；不能凭历史注释或包名推断授权。若provenance无法满足，停止translation并选择clean-room behavior implementation或请求owner决定，不能提交来源不明代码。

### 3. Metrics由fresh semantic fixtures而非CSV parity定义

Compatibility比较最终领域值与identity，而不是要求新backend模拟Lizard CSV protocol。Corpus覆盖fresh owners要求的function name、range、NLOC、parameter count、cyclomatic complexity以及anonymous/fallback semantics；特别覆盖multiline signatures、comments/strings、nestedfunctions、generics、macros/closures和malformed/incomplete source。

允许private parser结构和diagnostic wording变化；任何改变CheckResult、QualityRecord fields/identity、approved exact-input set、canonical ordering或comparison relation的差异必须先修复，或作为独立public behavior change获得确认。Position仍只用于current navigation，不进入stable record identity。

### 4. Per-file work通过private TaskPlan执行

`function-metrics` binding按frozen exact inputs建立per-file static Tasks并受invocation shared scheduler治理；Task identity与parser state保持private。每个fulfilled file analysis提交records并ack其owned domain-work handle；read/parser/validation failure不ack并使binding按foundation规则形成execution-failed report。其它file已经提交的valid records保留，Core从handles/reports计算coverage。

Completion只聚合owner-approved immutable results、验证canonical ordering并返回one CheckResult candidate。Backend不接触managers、policy或output，不把Task count映射为public coverage。若届时foundation owner选择更粗work handles，Task association适配该owner，不改变上述public semantics。

### 5. Current与references复用同一analysis contract

Current与每个explicit named reference都使用同一exact-input analyzer selection、validation和normalization。Producing Check继续拥有matching/comparison，reference identity在invocation前冻结。Cache key只包含relevant exact-input fingerprint、function policy和new backend/version identity；Project Definition fingerprint、unrelated policies或旧Lizardcommand/version不得成为无关cache inputs。

Backend switch必须使旧cache无法误命中；具体version bump由cache owner执行。No-input、successful zero functions、parser failure与dependency/config failure保持可区分。

### 6. Formal product path一次性hard cut

Parity和failure evidence通过后，把function-metrics private binding切换到TypeScript backend，并在同一Change删除formal Python/Lizard availability probe、process invocation、CSV parser、dependency slice、supported environment overrides、runtime diagnostics和production cache identity。不能保留fallback、dual-run或runtime switch。

Pinned Lizard可以只在test/dev migration oracle中暂时存在，前提是license/provenance明确、production import graph不可达且普通installed/dogfood验证不要求Python。若checked-in expected fixtures足以证明contract，则删除oracle dependency以缩小维护面。

### 7. Performance只承诺产品调用场景有证据

Baseline manifest记录representative corpus的wall time、peak memory或可稳定采集的等价资源signal。新backend必须在现有full workspace/dogfood timeout与scheduler budget内完成，并且没有被profile证明的数量级regression或unbounded per-file state。若measurement显示material regression，先用profile定位并修复；不为没有证据的microbenchmark数字建立public contract。

## Risks / Trade-offs

- **Exact-input syntax state差异会改变function boundaries或metrics。** 使用per-approved-input edge corpus、differential owner-level records和malformed-source failure tests，不以few happy-path fixtures代替。
- **Fresh foundation可能改变record identity/failure semantics。** Baseline task在foundation落地后读取current owners并冻结manifest；历史CSV或capability result不进入验收。
- **Clean-room analyzer比external process承担更多maintenance。** 只实现 approved exact inputs和Check owner要求的metrics，模块按exact-input category责任分开且不建立generic plugin framework。
- **Per-filetasks可能与coarse parser behavior不同。** Canonical completion与foundation coverage保持observable order/integrity；valid partial records按new Core contract如实保留。
- **Source/license不清可能阻塞implementation。** Provenance审计先于translation；无法证明时不写入derived code。
- **Same-process analysis可能带来CPU/memory regression。** 使用fresh baseline、full dogfood budget和profile evidence；shared scheduler只治理declared Tasks，不夸大内部资源控制。

## Open Questions

无。Exact code modules与fixture cases可按fresh baseline展开，但backend boundary、supported result目标、Task接入、hard cut、provenance和verification出口均已确定。
