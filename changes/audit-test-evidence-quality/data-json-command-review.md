# Data / JSON / command 测试证据全量审查

## 结论与边界

本分区 **29 文件、76 current entities 全部审读**，包括每个参数矩阵、实际调用的 test support、独立子进程 fixture 与文件中的类型委托；不是抽样。开始与落盘前核对 scope SHA-256，29 文件均无漂移。实体精确集合和哈希复核只保存在 Git 忽略的本地 coverage，不提交第二套 Case 账本。

没有足够证据支持直接整删任何实体。优先处理的是吞异常可假绿、负断言预满足、未区分失败 outcome、清理断言观察错阶段等局部问题；下列 8 项均是静态审查候选，不是已执行 mutation 后的结论，也不表示当前 Product 已有对应 bug。不得为了删测数量移除仍独占的证明义务。

已读 AGENTS、文档导航、测试策略、Case 维护、`test-evidence-review` skill、编码规范、Check results，以及 data boundaries、file-region、command、JSON/JSON Schema、output/output maintenance、Run outputs 的公开与内部 owner。Case owner/Proves 从本轮官方查询派生的 `cases-by-entity.json` 恢复；全树 766 entities / 190 Cases 的 closure 由主线程负责，本分区不重复运行。

CodeGraph 先用于定位并查询 `publishScanV4`、`executeJsonSchemaValidation` 的调用关系；不存在的猜测符号无结果后，按明确路径读取实际实现。没有运行测试正文、Gate、build、安装、网络请求或 Git stage/commit；下列判断不冒充动态验证。

## 逐文件覆盖与主要判断

下表的数量均为 runner entity，不把矩阵行、helper 或类型检查函数单列成实体。未在候选中指出的问题不代表文件未经审查。

| 文件 | 实体数 | 主要判断 |
| --- | ---: | --- |
| `src/check-settlement/fact-validation.test.ts` | 3 | 保留 detached/frozen snapshot 与 invalid ownership；accessor 不执行的信号需改写，见 DJC-01。 |
| `src/check-settlement/facts.test.ts` | 4 | 四态、exact snapshot/structural Record identity、closed descriptor 有价值；canonical helper 的弱 getter 行可局部合并，不能整删其独有负例，见 DJC-01。 |
| `src/check-settlement/session-lifecycle.test.ts` | 2 | 保留 live session 到 frozen facts 的 same-reference seam、注册快照、reason owner、取消与 accepted Record prefix；不由静态 validator 替代。 |
| `src/check-settlement/session-record-misuse.test.ts` | 2 | 保留不同 owner 同 local ID、duplicate/invalid write 的 owning-only unavailable 与重复 closure 拒绝。 |
| `src/data-boundary/canonical-data.test.ts` | 2 | 保留手写 canonical 文本、numeric-key 与 JSON.stringify 差异、深层 detached/frozen、getter 计数与 reflection failure；不是仅 roundtrip。 |
| `src/data-boundary/closed-values.test.ts` | 2 | 保留 exact-key 排序/重复/缺字段矩阵、浅引用与 undefined/函数、getter 计数、dense array；较大矩阵不因大小删除。 |
| `src/data-boundary/config-glob.test.ts` | 1 | 保留 pinned native matcher 差分及 regex 操作量 oracle；共享 options 属于固定后端适配边界，另有显式预期的 consumer 矩阵，不以同实现调用判自证。 |
| `src/data-boundary/context-callback.test.ts` | 1 | 保留 exact frozen demand、输入 mutation、unused producer 零读取、四种空需求和 closed invalid 声明；`normalizedInvocationTypes` 的 expect-error 委托已读，未执行。 |
| `src/data-boundary/project-file-region-index.boundary.test.ts` | 3 | 保留逐层 closed shape/getter 计数、path spelling、跨源 duplicate、opaque/NUL region ID；path 与 region ID 的义务不同。 |
| `src/data-boundary/project-file-region-index.test.ts` | 5 | 保留双向/空/未知、append vs batch 加手写结果、old-view 隔离、完整 native lists 和独立宿主无 I/O；bidirectional/roundtrip 不是唯一 oracle。 |
| `src/machine-output/v4/contract-materials.test.ts` | 1 | 保留 Ajv2020 对 runtime serializer bytes 的独立 schema 接受；不把它称作 checked-in/package materials 完整独立验收。 |
| `src/machine-output/v4/lifecycle.test.ts` | 4 | 保留 success、candidate write、first rename、partial rename 三个不同提交阶段；partial failure 的 temp 清理断言有遗漏，见 DJC-06。 |
| `src/machine-output/v4/publication.test.ts` | 2 | 保留四态最小 Record 投影、双文件 producing-path roundtrip、invalid metadata 与固定数字 key SHA-256；固定 digest 补足 serializer/validator 同源风险。 |
| `src/machine-output/v4/validation.test.ts` | 2 | 保留 v3 identity、非有限 final data、fingerprint、composite duplicate/order、unknown owner 与 Check order 的反例；relationship 精确断言阻止走错拒绝分支。 |
| `src/package-checks/command-check/command-check.environment.test.ts` | 3 | 保留真实 child 的 cwd/exact/inherit/no ambient、resolver context、完整非零 exit 由 completion 结算、invalid resolver 不 spawn；callback 内 assertion 最终由外部 passed/exit/records 断言闭合。 |
| `src/package-checks/command-check/command-check.terminal.test.ts` | 5 | 保留 output-limit stdout/stderr × planned zero/nonzero、callback/Records 不发布、timeout 与 Core throw containment、真实 caller cancel handshake 和 resolver cancellation。failed/unavailable 二选一有真实 race owner 支持且 failed data 固定 23，不容许 passed。 |
| `src/package-checks/command-check/command-check.test.ts` | 1 | 保留 constructor defaults/普通 Check composition、prepared replacement invalid 与 closed inputs；authoring 不冒充 Run 调度行为。 |
| `src/package-checks/command-check/command-check.transcript.test.ts` | 1 | 保留 null capability、running/final file replacement 与真实 final rename failure、completion 未调用；argument/env privacy canaries 未进入 fixture，见 DJC-02。 |
| `src/package-checks/host-environment/process/result.test.ts` | 2 | 保留结构化 cause priority 与独立 isComplete eligibility，包括 numeric nonzero 赢 cause 但仍 incomplete 的组合；不能由真实进程 race 稳定穷举替代。 |
| `src/package-checks/host-environment/process/runner.test.ts` | 3 | 保留真实 child marker/PID、async flags、同步 captured output 与 overflow 主动终止；独立 watchdog 不可成为成功原因。force-kill 子进程使用逻辑 escalation clock，但真实 SIGTERM acknowledgement、live PID、SIGKILL 和 dead PID 均有断言。 |
| `src/package-checks/json-document/strict-document.test.ts` | 7 | 保留 bytes→BOM→fatal UTF-8→grammar→decoded duplicate 优先级、所有 JSON roots、转义/Unicode/同键异对象矩阵、4096 深度/-0/private freeze 与 unavailable read；与 Check 级 safe Record 投影不重复。 |
| `src/package-checks/json-schema-validation/json-schema-validation.allowlisted-reference.test.ts` | 1 | 保留精确 request init（credentials omit、manual redirect、无自定义 headers）与远端约束真正改变 keyword result 的 oracle。 |
| `src/package-checks/json-schema-validation/json-schema-validation.default-contract.test.ts` | 1 | 保留 constructor/parser/preparation、invalid options、literal $async/$ref property 与 actual schema keywords 的区分、精确安全 Records/计数和 opaque ID shape。 |
| `src/package-checks/json-schema-validation/json-schema-validation.identity-and-scope.test.ts` | 3 | 保留 require-match、configuration-authoritative/boolean、out-of-scope blocks/no-bindings 与 local duplicate 分类；document-authoritative 模式未被区别性观察，见 DJC-07。 |
| `src/package-checks/json-schema-validation/json-schema-validation.offline-and-local-reference.test.ts` | 2 | 保留 zero-fetch 的 offline reject 与本地 registry resolution，后者通过远端式 local ID 的实际 type violation 观察到目标 schema，不是单看 zero fetch。 |
| `src/package-checks/json-schema-validation/json-schema-validation.reference-failure-boundaries.test.ts` | 3 | 保留 transport unavailable、redirect domain failure、remote duplicate-document failure 彼此区分；redirect 缺请求历史与 outcome，见 DJC-03。 |
| `src/package-checks/json-schema-validation/json-schema-validation.result-reporting.test.ts` | 2 | 保留非 email 文本通过 format annotation、101 full issues/100 Records/failed 与 truncation message；conditional 测试名超出输入，见 DJC-08。 |
| `src/package-checks/json-schema-validation/json-schema-validation.unsafe-schema-boundaries.test.ts` | 1 | 保留 credential/dynamic/recursive/async 原因与 zero-fetch，补全终态和安全 surface 断言，见 DJC-04；四场景不是四实体。 |
| `src/package-checks/json-validation/json-validation.test.ts` | 7 | 保留 mixed/rejected-only/zero-selected 的不同 outcomes、五种文档 issue、later unavailable accepted prefix、同步与 timer 取消；included/excluded fixture 被默认排除预满足，见 DJC-05。 |
| **合计** | **76** | **29/29 文件，76/76 实体；零未读。** |

## 局部改写、合并与命名候选

### DJC-01：throwing getter 没有证明零读取；只修局部，不整删

- **完整测试名与位置：** `check-record foundation runtime validation > rejects Check definition accessors without executing them`，`src/check-settlement/fact-validation.test.ts:8`（getter 与唯一断言在 10–16）；`check-record foundation model > materializes canonical final and Record data without evaluating author properties`，`src/check-settlement/facts.test.ts:82`（弱 getter 行 97–105）。
- **Owner / Case：** `docs/development/check-results.md#check-and-record-facts`；`WB-RUNTIME-CHECK-RECORD-001` 的 Proves 明确要求 invalid data 拒绝时不执行 accessor。
- **缺陷：** getter 直接 throw，测试只看 false/undefined。实际 `snapshotClosedRecord` 与 canonicalize 边界均 catch reflection/normalization failure；若回归为先读取 getter、再吞其异常，现有断言仍可通过。这里不是声称当前实现调用 getter；当前 descriptor 实现正确。
- **最小动作与承接：** descriptor 测试改为递增计数并返回合法字符串的 getter，同时断言 rejection 与 `getterCalls === 0`。`facts.test.ts` 可删除弱 getter setup/断言，复用当前 `canonical-data.test.ts` 的 `check-record canonical data > rejects accessors, sparse arrays, and reflection failures without invoking author hooks`（已有返回值+外部计数），或同样加计数。必须保留该实体的 cycle、toJSON、non-enumerable/prototype/named array 等不同负例；不能把全实体视作重复删掉。其它 canonical 重叠不是本身的删测理由。

### DJC-02：transcript 的 argument/environment 排除断言预满足

- **完整测试名与位置：** `commandCheck transcripts > requires artifact capability for transcripts and atomically retains only opted-in raw output`，`src/package-checks/command-check/command-check.transcript.test.ts:28`；fixture 32–38，负断言 54–55。
- **Owner / Case：** `docs/guides/command-check.md#输出`；`API-COMMAND-CHECK-TRANSCRIPT-001`，Proves 包含 transcript 不暴露 command input material。
- **缺陷：** `CANARY_ARGUMENT` 与 `CANARY_ENVIRONMENT` 只声明并用于 includes(false)，未放入实际 argv 或 environment。即使 transcript 错把全部 command arguments/environment 写出，这两个 canary 断言仍绿。
- **最小动作与保留：** 在真实 command 增加独立 argv sentinel 和 exact environment variable，让 child 检查确实收到但不输出它们；继续断言 raw stdout/stderr 出现、input canaries 不出现。保留 null artifact、blocked directory、running marker 后把 final target 换成目录导致真实 rename failure，以及外部 completionCalls=0；不能删除整个 transcript entity。测试不覆盖或承接 generic diagnostic metadata 的隐私。

### DJC-03：redirect 没有观察 no-follow，也没有约束失败终态

- **完整测试名与位置：** `JSON Schema validation default Check > treats an allowlisted redirect as a safe schema failure without following it`，`src/package-checks/json-schema-validation/json-schema-validation.reference-failure-boundaries.test.ts:51`（mock 58–63，断言 69–80）。
- **Owner / Case：** `docs/checks/json-schema-validation.md#referenceresolution-引用解析规则`；`ADD-JSON-SCHEMA-VALIDATION-REMOTE-POLICY-001`，要求不跟随 redirect，redirect 是 safe failed domain issue 而非 unavailable/passed。
- **缺陷：** fetch mock 对任何 URL、任意次数都返回同一 302；没有历史，无法发现额外访问 Location。只断言一个 Record 和私有域名未泄漏，`passed` + 同 Record 也满足。其它 allowlist success 测试观察了 manual init，但不能证明当前 redirect 分支没有手动 follow。
- **最小动作与保留：** 在 mock 外记录精确 URL 列表，返回首个授权 URL 的 302，对其它请求返回一个可区分结果；外部断言 requests 恰好 `[remoteId]`，再精确断言 `failed`、blockedBindingCount=1、issueCount=reportedIssueCount=1 与现有 safe Record/message。保留 redirect 独立分支，不合并成普通 transport failure。

### DJC-04：unsafe schema 的 Record 存在不等于 Check failed

- **完整测试名与位置：** `JSON Schema validation default Check > rejects credential-bearing, dynamic, recursive, and async schemas before any fetch or native diagnostic can escape`，`src/package-checks/json-schema-validation/json-schema-validation.unsafe-schema-boundaries.test.ts:15`（四段结果断言 47–118）。
- **Owner / Case：** 同 DJC-03 owner / `ADD-JSON-SCHEMA-VALIDATION-REMOTE-POLICY-001`；终态规则另见 `docs/checks/json-schema-validation.md#效果与结果`。
- **缺陷：** 四种输入只断 Record data，credential 场景多一条内容排除，最后检查 zero-fetch。没有断言 result status/data/message；保留正确问题 Record 却错结算 passed 或 unavailable 的实现仍可能通过。getter/callback 内 throw 已用外部 calls=0 避免吞异常，但 outcome 没闭合。
- **最小动作与保留：** 每场景外部断言精确 failed final data（bindingCount/schemaCount=1、blockedBindingCount=1、invalid/valid=0、issue/reported=1、未截断）、safe error message 与现有 compile reason/zero-fetch。可把四种同构 setup/action/assert 收进同一实体内矩阵，仍保留四种原因义务，不按矩阵行拆实体或删除 security tests。

### DJC-05：Check 自有 exclusion 被默认防呆层遮蔽

- **完整测试名与位置：** `JSON validation default Check > uses only its included JSON paths without re-adding excluded paths`，`src/package-checks/json-validation/json-validation.test.ts:217`（fixture 220–229）。
- **Owner / Case：** `docs/development/project-files.md#package-provided-check-exact-inputs`；`ADD-JSON-VALIDATION-SCOPE-001`，Proves 要求 excluded/out-of-selection paths 不被重新发现。
- **缺陷：** 两份 invalid 文件只在 `generated/` 与 `vendor/`，均已属于默认固定排除；fixture 未关闭默认排除。删掉当前显式 negative patterns 仍得一份 valid 文件的相同结果。因而不能辨别 Check 忽略用户负规则、仅重建默认 selection 的回归。
- **最小动作与保留：** 使用不在默认排除中的目录作为用户 exclusion，或显式 `useDefaultExcludes: false`；保留一个 included valid 文件和 excluded invalid 文件，精确断言结果 unchanged/无 Records。可在同一实体加无负规则对照以证实 invalid 文件本来可被选到。共同 collection matcher tests 不代替该 Check 不扩大范围的入口义务。

### DJC-06：partial replacement 检查的是发布前已删除的旧 temp，不是失败后的新 temp

- **完整测试名与位置：** `machine publication v4 lifecycle > cleans a partial replacement without deleting legacy-named or unrelated files`，`src/machine-output/v4/lifecycle.test.ts:85`（108 只看 `.vibe-check-publication-prior.tmp`）。
- **Owner / Case：** `docs/output.md#发布与并发读取边界`；`WB-OUTPUT-PUBLICATION-LIFECYCLE-001`，Proves 要求 partial handled failure 清理 canonical files 与 owned temps。
- **缺陷：** second rename 注入前，publisher 已在 staging 开始时清掉 prior.tmp。若失败恢复只清两份 canonical、留下新生成的 records temp，105–109 全部仍成立；断言观察的旧 temp 未落在真正待测的 failure cleanup 阶段。
- **最小动作与保留：** 保留真实 first-success/second-failure 注入，增加 `readdirSync(directory).filter(name => name.startsWith('.vibe-check-publication-'))` 等于 `[]`，与同文件 `assertUnchangedPublicationAfterFailure` 现有全前缀断言一致。保留 canonical pair 删除、legacy/unrelated bytes 不变；不要用 prior-artifact failure 测试替代这个已过提交点的生命周期。

### DJC-07：document-authoritative 与 configuration-authoritative 没有区别性 oracle

- **完整测试名与位置：** `JSON Schema validation default Check > applies all three Check-level root identity modes without exposing document IDs`，`src/package-checks/json-schema-validation/json-schema-validation.identity-and-scope.test.ts:15`（document branch 64–78，mismatch 80–97）。
- **Owner / Case：** `docs/checks/json-schema-validation.md#jsonschemavalidation`（精确语义在同页 schemaIdentity 根身份规则）；`ADD-JSON-SCHEMA-VALIDATION-IDENTITY-OUTCOMES-001`。
- **缺陷：** document-authoritative 输入只是 `type: object` + `{}`，只断 passed；即使把此模式实现为 configuration-authoritative，也会 passed。没有引用解析或其它结果使用 document engine identity。mismatch 场景同样只断 Record，未闭合 failed；也未在可观察完整结果上检查 raw identity 不泄漏。
- **最小动作与保留：** 在同实体中增加或替换为本地两 schema 的区分输入：一项 configured label 不同于 document ID，另一项 `$ref` 指向 document ID；断言 document mode 的真实 keyword result 与 public configured schema label、zero-fetch；相同 registry 在 configuration mode 应有不同结果。保留 configuration/boolean/require-match 原证据，mismatch 补 failed/blocked/count；完整返回结构排除 raw private identity。无须创建新 entity 或拆 Case。

### DJC-08：conditional keyword 标题没有对应输入，收窄名称即可

- **完整测试名与位置：** `JSON Schema validation default Check > accepts standard conditional keywords and format annotations without extra plugins`，`src/package-checks/json-schema-validation/json-schema-validation.result-reporting.test.ts:14`（schema 21）。
- **Owner / Case：** `docs/checks/json-schema-validation.md#效果与结果`；`ADD-JSON-SCHEMA-VALIDATION-RESULTS-001` 的 Proves 实际要求 format annotation，不声明这项 conditional 覆盖。
- **缺陷与最小动作：** fixture 无 `if/then/else` 或其它 conditional；当前实体真正证明非 email 文本按 annotation 通过。保留精确 passed/counters/empty Records，将名称收窄为 format annotations 并按 rename 保持原 Case ID/更新映射即可；不为名字反向制造 conditional 新测试义务。若另有当前 owner 验收需求再补真实条件输入。本项优先级低于上列语义假绿。

## 关键保留与跨分区核对

1. **Machine write failure 已有，通用 writer close 没有被它承接。** `lifecycle.test.ts:34` 的 candidate writing failure 实际替换 `fs.writeFileSync`，只在第二次写入 throw；first rename 与 second rename 也真实触发各自阶段。`publish.ts` 先投影/serialize/validate complete set，`atomic-publication.ts` 才同步写 temps/rename；该边界没有独立 writer.close API。它证明机器 publisher failure lifecycle，不证明 diagnostic/progress writer 的 write/close status 与 RunResult 优先级。后者须由 Run outputs owner 审查，不能从本组推全仓缺口。
2. **Roundtrip 不是唯一 oracle。** Machine 有四态手写 Record、已知数字 key digest、负 relationship 检查以及独立 Ajv schema acceptance；repository raw-material validator 是否完整由其负责分区判断，不混成一个 validator。file-region 有 append/batch 对照，但另有显式预期、known-empty/unknown、mutation 与 native lists。
3. **真实 process 与 normalization unit 分工不同。** Unit 可确定性构造 numeric exit 与所有 incomplete markers 组合；真实 child 证明 cancellation 传递、overflow 主动终止/PID 已退出、POSIX 忽略 SIGTERM 后 escalation。`force-kill.test-support.ts` 完整读过：时钟只替换默认 5000ms escalation 请求，SIGTERM acknowledgement 与 SIGKILL/PID 观测是真的。不能按耗时、同 Case 或依赖实现耦合直接删掉真实层。
4. **Strict-document 与两个 JSON Checks 各有边界。** 前者保留 private value/-0/Infinity，不是 public canonical JSON；后者归一化 safe Record/count/status，并且 schema engine 把非 JSON schema 输入作为 domain issue。不能因为读取链共用而删掉 caller settlement。
5. **Handoff 交叉复核：没有 scheduler log / records.ndjson / diagnostic presence-only metadata 的直接证据。** 本 76 实体没有 handoff fixture。另按主线程要求读取非本组的 `src/project-run/progress-rendering/invocation-diagnostic-data.test.ts:41`，`Package Run diagnostic logging output > keeps accepted handoff references out of machine and diagnostic publication`：它证明 consumer 取得同一 Map reference、snapshot provider outcome 无 own `handoff`、core log 无 `handoff-private-byte`，以及 `run.json` 无该内容和精确 `"handoff"` 字段。它没有读取 scheduler channel 或 `records.ndjson`，core log 也没有检查 `handoff={}` / presence-only flags；Map 被 JSON 序列化为空对象时单看内容 canary 不足。不能把这项据为三个未观察面的直接证据，亦不据此断言全仓均缺证；其它分区继续核对。command transcript 的 input privacy 也不自动覆盖 generic diagnostic metadata。该额外交叉读取不计入本组 76 的覆盖数。

## 实际读到的委托材料与实现边界

- Test support：`src/check-settlement/session.test-support.ts`；`src/data-boundary/project-file-region-index.test-support.ts`；`src/machine-output/v4/publication.test-support.ts`（含 readValidatedMachinePublication）；`src/package-checks/command-check/command-check.test-support.ts`；`src/package-checks/check-execution.test-support.ts`；`src/package-checks/host-environment/process/force-kill.test-support.ts`；`src/package-checks/json-schema-validation/json-schema-validation.test-support.ts`。上述文件的实际委托正文全读，不以父测试名字代替。
- In-file helper：strict-document inspectBytes/inspectText/assertIssue/assertValid、region relationView/assertBidirectional、machine validCandidates/assertFailure、command waitForFile/cancellation helper、JSON validation collector/onRecordReported、schema requestUrl/withFetch/default contract 均读过。withFetch finally 恢复 descriptor；executeCheck 直接等待 callback，不自行判成功，故外围 result/Records 断言仍必要。
- 类型委托：`context-callback.test.ts` 的未执行 `normalizedInvocationTypes` 及 expect-error、`defineContextCallback` 各 overload 与 runtime identity-return implementation 全读。它们不是额外 runner entities；本轮没有 typecheck，不能称编译验证通过。
- 为裁决候选，读取了 descriptor/snapshot/canonical boundary、live session/record-store/outcome normalization、region/glob/context callback、machine publication/atomic write/projection/serializer/schema、command constructor/callback binding/execution/transcript、process result/runner、strict-document/duplicate-key、JSON validation、schema execution stages/engine/policy/reference resolver/remote response/issue collector 等相邻实现。未将读取实现等同动态证明。

## 验证、风险与交接

实际运行仅为只读文件/行号/Case 读取、CodeGraph 查询与 SHA-256/计数复核；scope 文件数 29、entity keys 76、hash mismatches 0。本地 `coverage.json` 的 `reviewedEntityKeys` 精确列出全部 76 个已读 keys，`unreviewedEntityKeys` 为空。

未运行最窄测试、mutation/counterexample、typecheck、材料验证、全树 closure 或 Gate；前者按本分工明确禁止执行，closure 与交付材料验证交主线程统一汇合。建议后续实施先改 DJC-01/02/03/04/05/06 的 fixture/断言，再处理 DJC-07 模式区分与 DJC-08 rename；每次遵守 Case 前后全树闭合并运行最窄行为测试。当前报告不授权删除测试、改 Case 或降低 Gate。
