本 tasks artifact 仅规划显式 JSON Schema 2020-12 validation 的后续实施；阻塞审计完成前不得执行任何实现任务。

## 1. 阻塞审计

- [ ] 1.1 **BLOCKING：实现前审计。** 在修改源码、tests、docs、schemas、examples、dependencies 或配置前，确认 `standardize-quality-capability-contract`、`add-file-policy-overrides`、`add-json-validation` 已按顺序完成审计和实施；逐项核对本 change 的 proposal/design/specs/tasks 都围绕开头核心句，capability ID `json-schema-validation` 与 modified `scan-configuration` 符合命名/owner 规则，exact schema check IDs、final key/kind/required/order/redaction evidence catalogs、generic `FindingEvidence`、sorted public catalog/`semanticRegistryFingerprint`与immutable machine v2 schema bytes、config v2/partial patch/JSON document-location service/exact-input ownership与最终prerequisite contracts一致；专项审计(1)raw `$ref`/userinfo/query/credential及digest绝不进入message/log/evidence，(2)descriptor causal input closure维持`regressions ⊆ changed`且不推断baseline，(3)schema defect只发布root finding、binding short-circuit仅internal且不新增machine shape；确认artifacts未宣称已批准/可直接实现、未越过change目录预改长期owner/其它change、`## Open Questions`无未回答项；以official 2020-12 conformance与source证据审计schema engine候选的meta-schema、`$ref`/`$dynamicRef`/recursive behavior、offline resolver hook、all-errors、Bun compatibility、license、维护、determinism与1..67108864 shared JSON resource bound。任一项未闭合即修订/重审，**本项完成前不得执行 2.1 及之后任何任务**。

## 2. 测试证据与配置 v2

- [ ] 2.1 在改测试前按`test-evidence-review`流程运行`bun run test-evidence:check`并查询scan-configuration/scope/finding/output/adapter Cases；为registry/binding conflict、stage isolation、refs、dual-location、comparison/cache和CLI acceptance明确Proves/Owner，先写最窄失败测试。
- [ ] 2.2 在common config v2 check source加入optional-but-complete `checks.jsonSchema`、neutral规范贡献enabled+empty registry/bindings和只能patch已声明base的`enabled` closed partial patch；实现缺失不补默认、section存在时同时要求完整`checks.json`及其1..67108864 maximum bound、schema/binding验证、registry-owned exact accepted check IDs及`ResolvedFilePolicy`/`explain-config`投影。
- [ ] 2.3 实现plan-time selector resolution与conflict diagnostics：schema selector恰好命中一个approved file、binding schema存在、instance零或一个binding、global scope不可扩大；覆盖duplicate names、unknown dialect、unresolved schema、outside-root、overlap与v1 hard cut/unknown/backend field failures。
- [ ] 2.4 同步runtime/derived config types、neutral default、init/editor schema、canonical example、fixtures与Configuration docs并运行generation/drift checks；证明registry/bindings是selected base policy而非per-file replacement或second merge owner。

## 3. JSON document ownership and engine boundary

- [ ] 3.1 扩展execution planner，使explicit schema/instance paths由schema capability拥有、ordinary JSON selector排除这些paths；复用同时声明的JSON base之bytes→parsed value/location index与per-file`checks.json.maximumBytes`，测试证明同一bytes不重复parse/emit finding且schema precondition不被ordinary JSON enablement绕过。
- [ ] 3.2 建立具体internal schema-engine boundary与bundled 2020-12 meta-schema/explicit registry，封装compile/evaluation/error normalization/resource budget；dependency names/options/errors不得进入public config或stable finding identity。
- [ ] 3.3 实现schema JSON→dialect consistency→meta-validation→compile→reference closure→instance evaluation的internal typed stage results与binding short circuit；证明schema content defect只发布defined root finding、dependent bindings仅internal短路、independent bindings继续，且不生成synthetic instance/blocking finding、public binding diagnostic、portable not-evaluated record或machine field；execution/invalid-result failure与partial isolation保持shared semantics。

## 4. Offline reference resolution and diagnostics

- [ ] 4.1 实现in-memory、project-root/registry/approved-input限定的URI resolver；local path只查询normalized inventory并向Core请求单一staged exact input，禁止root search/traversal；默认拒绝HTTP/HTTPS/其它remote schemes且监视zero network calls。Diagnostic boundary只输出safe registry/schema ID或project-relative target/pointer/stable reason；用含userinfo/query unique token的remote `$ref` leak canary证明message、suggestion、stdout/stderr、logs、evidence与machine artifacts均不含raw ref、token或其digest。
- [ ] 4.2 实现cycle-aware bounded reference graph，覆盖valid recursive/dynamic refs、diamond graphs、unsupported/non-terminating cycle、depth/node/work budgets；valid 2020-12 recursion不得仅因有环报错，`reference-cycle`不得退化为hang/generic execution failure。
- [ ] 4.3 注册五个exact schema checks及key/kind/required/order/redaction evidence catalogs，将engine errors映射为deterministic findings：common primary location、binding/registry IDs、project-relative schema/target paths、RFC 6901 schema+instance/target pointers、schema secondary location、keyword与stable compile/reference reason；reference optional target keys只接受safe projection，missing token定位owning container，不序列化raw `$ref`/URI/userinfo/query/credential/digest/value、absolute path或backend wording。

## 5. Capability, comparison, cache and output

- [ ] 5.1 注册`json-schema-validation` descriptor、registry-owned semantic check IDs、request predicate与causal input closure；测试quick/section missing/effective disabled均`skipped`，仅full+effective enabled进入planning且无binding work为`no-input`；接入succeeded/failed、independent binding continuation、finding ordering、acceptance/channels/gate。Human/console short-circuit summary只能从internal plan+published root finding派生且不成为portable contract。
- [ ] 5.2 实现current causal input closure与explicit-baseline comparison fingerprint：closure含primary、binding instance、root及实际transitive local schema/reference paths，任一命中resolved changed scope即changed；regressions只从changed current findings按binding/registry/paths/pointers/keyword identity比较，保持`regressions ⊆ changed`。验证referenced schema changed+instance unchanged产生changed finding、explicit baseline regression与omitted-baseline current-only不推断。
- [ ] 5.3 实现reference-graph/content-addressed compile cache与binding+instance evaluation cache，identity覆盖dialect/rules/normalized plan/transitive schema bytes/instance bytes/relevant file policy/internal implementation；测试ref change精确失效、cycle closure与execution failure不缓存。
- [ ] 5.4 经foundation single mapper投影common location与generic typed evidence，更新sorted public catalog expected `semanticRegistryFingerprint`、canonical examples、producing-registry catalog validator、artifact-set/warning validators、consumer与human fixtures；以双向exact drift test证明fingerprint按预期改变而runtime/published canonical machine v2 schema bytes和URI不变，不创建schema-specific schema branch、machine stream或second registry。

## 6. Acceptance, security and owner synchronization

- [ ] 6.1 增加formal Product CLI acceptance：quick/missing/disabled skipped、enabled empty no-input、schema-without-JSON-base config failure、valid/invalid schema document、dialect/meta/compile、local/remote/unresolved/cycle refs、valid/invalid/malformed instances、binding conflicts、execution failure、baseline/cache和gate outcomes。
- [ ] 6.2 增加security/resource tests，证明resolver不访问network/root外或unapproved files，selector/adapter不遍历root，resource exhaustion可行动；reference credential canary覆盖machine/human/log/evidence且不泄漏raw ref、userinfo/query、token或digest，也不泄漏host path/backend details。
- [ ] 6.3 更新Architecture、Configuration、Scan Scope、Quality Metrics、Output、Scanner dependency与导航owner段落，明确2020-12-only、explicit binding、offline refs、safe reference projection、descriptor causal changed closure、internal-only binding short circuit及stage/failure/location/cache语义；同步Cases并运行完整`bun run test-evidence:check`。

## 7. Verification

- [ ] 7.1 依次运行最窄config/schema-engine/ref/cache/output tests、official 2020-12 targeted conformance、product import boundary、typecheck、lint与product tests；再运行`bun run validate`和`bun run verify:vibe-check-workspace:required`，修复全部范围内失败。
- [ ] 7.2 用local registry、recursive refs、overlap selectors、invalid UTF-8/BOM、large/deep inputs和whitespace-location fixtures做adversarial复核；用局部diff与`git status --short`确认无backend public字段、无隐式root/network I/O且只改计划范围。
- [ ] 7.3 重新运行`openspec validate add-json-schema-validation --type change --json --strict --no-interactive`，核对所有spec scenarios有执行证据与依赖/迁移材料；只有实现和验证均完成后才勾选本任务集并进入归档评估，未经明确要求不归档。
