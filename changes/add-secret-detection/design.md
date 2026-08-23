# Design

本设计让 raw secret 只存在于每个 detector task 的受限内存，并以不依赖秘密值的语义记录完成检测、覆盖和失败表达。

## Context

当前 Configuration 与 Quality Metrics owner 已建立 ordinary Check、Project Definition 和 Check/Record Core facts。[`keep-sensitive-quality-record-material-ephemeral`](../../docs/decisions/keep-sensitive-quality-record-material-ephemeral.md) 明确要求 secret bytes、value-derived digest、credential URL 与原始证据不进入公共或持久边界；[Check-local Record data](../../docs/decisions/report-check-owned-record-data-with-local-identities.md) 与 [`expand-format-aware-built-in-checks`](../../docs/decisions/expand-format-aware-built-in-checks.md) 提供本 Change 的 future Record 与产品方向。

本 Plan 形成时列出的 Check/Core、Task graph 与 Project Definition foundation 已由当前 owner 取代；恢复实施前必须按 [Active Change Portfolio](../active-change-portfolio.md#这些-plan-的恢复边界) 重新映射实际 seam。仍未完成的直接依赖是 `add-file-policy-overrides`。本 Check 只注册自己的 policy、local Record data、author IDs、verdict 与 private detector，不复制 manager、scheduler、loader 或 resolver，也不要求 Product-wide policy 解释 custom Record data。

## Goals / Non-Goals

**Goals:**

- 对approved ordinary files执行bounded、extension-independent的高置信度secret detection。
- 从类型与control flow上阻止raw source/match进入公共manager、diagnostic、cache和output。
- 让finding identity、comparison、acceptance与policy只依赖安全semantic evidence。
- 让oversized unknown text形成显式coverage record，而不是clean success。
- 通过shared TaskPlan约束并行与资源，不建立feature-local scheduler。

**Non-Goals:**

- 不承诺发现全部秘密或证明某个credential仍有效。
- 不扫描Git history、remote stores、home、environment、binary files或未进入global inventory的path。
- 不公开detector command、third-party rule name、arbitrary regex或value-based suppression。
- 不保存raw detector artifact或persistent result cache，不自动remediate source。

## Decisions

### Intended Change

#### Decision 1: Policy 是 closed 产品语义，不是 detector 配置

Product neutral definition注册并启用 Secret Detection Check，neutral `maximumFileBytes = 1048576`。Check-owned schema将limit约束为inclusive `1..67108864`，并提供closed Product rule-set选择；Project Definition可以选择或省略该built-in Check。File policy只能覆盖`enabled`、limit和owner明确允许的rule-set selection，不能从absent base构造Check、恢复global scope或写入regex、command、args、backend、raw sample或secret matcher。

本Change不创建secret-specific allowlist。通用closed DecisionPolicy只可按stable check/record/rule ID、record identity、project-relative path等安全字段选择或接受records，并要求现有policy owner定义的理由；message、raw value、substring、regex和detector metadata从不成为operand。

#### Decision 2: Candidate classification 对大小和text保持保守

Resolved policy enabled的ordinary inventory file成为static candidate。Task先取得safe integer size：

1. `size <= maximumFileBytes` 时执行一次bounded full read；只有完整bytes为valid UTF-8且无NUL才进入detector，否则计为normal non-text exclusion。
2. `size > maximumFileBytes` 时最多读取前8192 bytes；prefix中存在NUL或完整可判定的invalid UTF-8 sequence时计为non-text exclusion。Prefix boundary上的incomplete UTF-8 sequence或没有反证都不能证明suffix是text，必须产生coverage gap；detector与full reader对该path均zero calls。
3. Stat、bounded read或classification异常是execution failure，不能降级为non-text、coverage gap或zero finding。

每个正常candidate在CheckResult coverage中恰有`scanned`、`non-text-excluded`或`size-unscanned` disposition。Size-unscanned同时提交`secret-scan-coverage-gap` QualityRecord，safe fields为normalized path、`actualBytes`和effective `maximumFileBytes`；identity只使用path与limit，不读取content或actual size。

#### Decision 3: 首版使用 Product-owned 高置信度 rule catalog

Private `SecretDetector` boundary只实现closed Product semantic rules，首版至少包含private-key material、known token format与strong credential-assignment context三类stable Product rule IDs。Provider-specific或algorithm-specific细节留在private implementation；generic entropy-only match不作为独立rule，因为缺少context时误报高且容易推动value-derived evidence。

Detector不接受project regex、custom command或ambient rule bundle。若实施选择辅助library，它必须位于同一private boundary并通过license/security审查，且不得改变Product rule IDs、record contract或把native output交给公共边界；没有必要证据时优先Product-owned implementation而不新增dependency。

#### Decision 4: Raw material 生命周期止于 detector task

每个candidate Task在invocation-owned bounded memory中持有source和match。Detector-to-normalizer handoff只包含Product rule ID、current span和一个bounded structural context，其中所有detected spans都已替换为固定marker；raw match、source excerpt、native error、match length和value-derived digest不允许越过handoff。

Sensitive path不调用通用raw writer、structured source logger、persistent cache或会插值unknown error的wrapper。Normalizer完成safe identity/location/record后立即释放source references；捕获的unknown failure只通过allowlisted error kind、Check ID和recovery action形成diagnostic。

#### Decision 5: Occurrence identity 不消费secret value或location

`likely-secret`使用独立record type。Record identity由versioned domain、stable Product rule ID、normalized source path、markerized bounded structural context和同path/rule/context中的deterministic occurrence ordinal派生；同一context中的全部detected spans都先markerize。Raw secret bytes不被hash、encode、比较或保存，line、column、range、message和arrival order也不参与。

Current location单独用于navigation。Same structural occurrence只发生line movement或secret rotation时identity保持稳定；新增structural occurrence获得新identity。Trade-off是value rotation本身不构成新record，但current record仍存在并可由selected DecisionPolicy处理。

#### Decision 6: Safe records可以逐项提交，执行完整性单独表达

Shared TaskPlan在planning阶段按candidate files建立静态Tasks，使用invocation scheduler的bounded slots与named sensitive-memory resource；Task不成为public identity或policy operand，feature不再嵌套`Promise.all`或私有pool。

每个 Task 完成 safe normalization 后可以向 RecordManager 提交 records。全部 required Tasks 与 completion 正常结束时，private completion summary 可保留 disposition counts 与 `clean | findings | coverage-gaps` 分类，但 producing Check 只返回 foundation closed verdict：无 `likely-secret` finding 且无 `secret-scan-coverage-gap` 时 `passed`；存在任一 finding 或 coverage gap 时 `failed`。Normal non-text exclusion 可进入 safe summary，不单独使 verdict 失败。

Task、detector、read 或 protocol failure 使 CheckRun failed 且 `result = null`；此前已提交并通过 validation 的 records 保留，不能因为后续失败撤销，也不能凭这些 records 声称 coverage complete。

#### Decision 7: 测试只使用isolated synthetic material

Tests只扫描isolated fixtures和detector doubles，每个fake secret使用明确不可用于真实系统的unique canary。Harness在success、accepted policy、gate、read/detector/protocol failure中对stdout、stderr、console、report、machine artifacts、raw/temp/cache目录和captured logs执行canary、prefix、suffix与value-derived digest absence检查；不读取workspace root、home、environment或真实credentials。

### Resulting Impacts

- policy、candidate classification、closed rule catalog 与 shared TaskPlan 必须保证 raw secret bytes 只停留在 detector memory，并以 bounded text/coverage 处理限制输入。
- safe records、structural identity、CheckResult/CheckRun、DecisionPolicy、cache/output 与 synthetic leak-canary 必须共同排除 raw value、可反推 fingerprint 及其它泄漏路径。

## Risks / Trade-offs

- **High-confidence catalog 会漏报未知格式。** 首版优先safe output与可解释性；新增rule必须有synthetic证据和stable Product semantic ID，不以generic entropy快速扩张。
- **Structural context/ordinal 会受附近相同occurrence插入影响。** 使用bounded markerized context与equal-key ordinal限定变化；不退回value或line identity。
- **1 MiB neutral limit不扫描大文本。** 未证明non-text的oversized path产生可处理coverage record；项目可在64 MiB hard cap内提高limit或缩小scope。
- **同进程内存不是安全sandbox。** 文档不承诺隔离；通过短生命周期、禁止公共传播、最小error surface和canary降低扩散风险。
- **Failure后仍保留earlier records可能被误读为完整。** CheckRun failed、result null与coverage evidence独立显示，DecisionPolicy必须同时消费完整性与records，Core不从records推断成功。

## Open Questions

无。具体private helper或辅助library只有在不改变closed Product rule、memory、identity、record和failure contract时才能选择，因此不阻塞实施。
