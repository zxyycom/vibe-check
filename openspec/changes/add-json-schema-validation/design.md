本 design 说明显式 JSON Schema 2020-12 validation 的配置、依赖与执行边界；它是临时 change artifact，尚未完成阻塞审计。

## Context

Generic Product 当前没有 schema registry或instance binding。Repository scripts只为本仓库docs current/historical artifacts维护固定traversal与explicit registry，这些调用和registry不能提升成外部项目默认。Prerequisites将依序提供content capability foundation、semantic config v2/per-file patches以及strict JSON bytes/duplicate-key/location contract。

JSON Schema横跨public config、schema dialect/meta-schema、compile/reference resolution、instance evaluation、network security、source mapping与transitive cache。首版只需要一个现实provider，但同一底层engine的调用、error与resource policy必须收口在具体dependency boundary；public config和finding不得泄漏engine名称。

## Goals / Non-Goals

**Goals:**

- 以显式config v2 registry/bindings得到deterministic、conflict-free execution plan。
- 分阶段处理schema JSON、dialect/meta-validation、compile、refs与instances，使content defects和execution failure可区分。
- 默认零网络并限制local refs在project root/registry/approved inputs内。
- 同时保留schema与instance精确位置/pointer，并让comparison/cache覆盖transitive schema graph。

**Non-Goals:**

- 不支持draft-04/06/07/2019-09或自动dialect协商；首版仅2020-12。
- 不根据filename、directory、instance `$schema`或discovery order生成bindings。
- 不提供remote ref opt-in、schema download/cache、code generation、instance coercion/default insertion或自动修复。
- 不复用或公开`scripts/**` docs registry，也不让product runtime读取`docs/**`。

## Decisions

### Decision 1: JSON Schema change严格位于三个prerequisites之后

实现顺序为 `introduce-content-quality-foundation` → `add-file-policy-overrides` → `add-json-validation` → 本change。Schema capability复用exact-input/finding/completeness/machine v2、config v2 patch/path grammar以及strict JSON parsed document/location index。阻塞审计必须读取这些changes的最终artifacts/归档spec；发现漂移先修订本change，禁止添加并行registry、parser或machine shape。

直接把scripts validator搬进Product会违反runtime owner、root traversal与fixed registry边界，因此拒绝。

### Decision 2: Common config v2 check source产生完整registry/binding plan

Common check schema source新增optional-but-complete、tool-neutral `checks.jsonSchema` base：`enabled`、invocation-wide `schemas`与`bindings`；缺失保持未配置且loader不补默认，本feature规范性地向neutral default贡献enabled+empty arrays。Schema entry用`name/files/dialect`，binding用`name/schema/files`。Partial override只派生`enabled`、只能patch已声明base section，不允许path-local registry/binding replacement或由patch构造缺失section。Schema section存在时base必须同时声明完整`checks.json`，为strict JSON stage提供1..67108864 bound内的`maximumBytes`，neutral复用5242880。Config normalization负责name唯一、registry引用、dialect enum、project-root path与selector overlap；Core selector随后结合`ResolvedFilePolicy`和normalized inventory，产出approved schema/instance exact inputs和每个instance零或一个binding。Conflict是config error/exit`3`，发生在任何compile前。Exact semantic check IDs由Product registry拥有并供accepted-finding validation复用。

允许多个bindings命中后按顺序覆盖会使声明顺序成为隐藏precedence；按filename/instance `$schema`推断会把文件内容变成未审计config source，故均拒绝。

### Decision 3: 建立具体schema-engine boundary，不承诺public provider abstraction

一个Product-owned internal module集中2020-12 meta-schema registration、compile、reference callbacks、resource budgets与backend error normalization。Core只传validated registry graph、immutable parsed schemas/instances和limits，接收Vibe Check-owned stage results/findings。首版没有现实切换义务，因此不创建public provider选择、config engine field或多实现factory；若未来第二implementation确需履行同一contract，再在此具体boundary后演进。

Engine selection属于实现前审计：必须确认2020-12 coverage、`$dynamicRef`/recursive semantics、offline resolver hook、all-errors behavior、Bun compatibility、license/maintenance与deterministic normalization。Backend-specifickeyword/error code只能在boundary内使用。

### Decision 4: Schema plan拥有显式输入并复用JSON document service

Schema selectors/bindings命中的approved paths从ordinary JSON capability exact inputs移交给schema capability，避免同一bytes的syntax/duplicate finding重复。Schema runner调用`add-json-validation`建立的immutable bytes→parsed value/location index service，使用每个path的`checks.json.maximumBytes`；schema check的显式binding本身请求这个precondition，因此不受ordinary `checks.json.enabled`抑制。Strict JSON finding仍使用JSON semantic check IDs，但capability result归schema owner。

Request predicate固定为：quick、section absent或effective enabled全为false时`skipped`；full且base enabled，或至少一个in-scope path被override解析为enabled时才请求；requested plan没有approved binding work为`no-input`。这样patch仍可做path-level opt-in/out，而empty work不被误写成skipped。

替代方案让两个capabilities都parse/emit会造成duplicate findings和cache；让`json.enabled=false`跳过schema JSON precondition会误称schema可compile，均拒绝。

### Decision 5: Pipeline以binding为隔离单元并显式短路

每个registry entry依次经过strict JSON、dialect consistency、meta-validation、compile与ref graph closure；每个binding只在其schema closure成功后评价instances。Stage产生internal typed result union：completed zero/findings、content-blocked与execution-failed。Schema content defect只发布已定义root finding；`content-blocked`仅让internal plan确定性短路dependent binding，不能投影synthetic instance/blocking finding、binding-scoped diagnostic、portable not-evaluated record或machine field。Independent bindings继续；execution failure使shared capability failed，partial results不能提升completeness。Human summary若提及短路，只从同一internal plan与published root finding派生，不形成portable contract。

把所有异常都转为instance-invalid会掩盖schema author错误；任一schema finding立即终止整个capability又会损失独立bindings证据，故采用dependency closure隔离。

### Decision 6: Resolver是零网络、project-bounded的唯一I/O owner

Compile前构造in-memory URI registry。Resolver只接受root schema base、explicit registry IDs与approved local documents；local path按source base归一化后查询Core提供的normalized inventory index，只能请求该单一target作为staged exact input，批准前不可读取，也不获得root用于搜索。Remote schemes直接产生`json-schema-reference`/`remote-disabled`且不调用network API。Diagnostic boundary在任何message/log/evidence构造前丢弃raw `$ref`，URI display删除userinfo/query且不得输出credential token或digest；只保留source schema、normalized registry/schema ID、project-relative target/pointer或stable reason。Graph closure记录edge与visited state，使用明确node/depth/work budget。

Cycle不一律判错：engine可按2020-12语义安全评价的recursive refs保留；unsupported/non-terminating或超过budget的cycle规范化为`reference-cycle`。Unresolved target、outside-root、remote-disabled与cycle分别建模。

允许engine默认loader会产生隐式filesystem/network访问；一律拒绝并用resolver callback封死边界。

### Decision 7: Exact checks与typed evidence catalog拥有双侧诊断

Descriptor注册exact IDs `json-schema-dialect`、`json-schema-invalid`、`json-schema-compile`、`json-schema-reference`与`json-schema-instance`，strict document defects复用JSON checks。Common primary location只属于当前主要source；descriptor evidence catalog用typed ordered entries公开schemaId/pointers、compile/reference reason以及instance finding的bindingId、instancePointer、schemaPath/pointer、schemaLocation与keyword。Reference catalog只增加safe optional targetSchemaId/targetPath/targetPointer，永不保存raw reference。每个catalog固定required/optional、order、identity participation及normalized/no-raw-content redaction；schema secondary location不参与identity。

`add-json-validation`的parser boundary向本capability提供immutable parsed value与token-to-pointer index，而不是重新parse bytes。Engine instancePath/schemaPath等opaque结果在boundary内映射为RFC 6901 pointers，再查询两侧index得到common primary和schema secondary location。Missing property等无token场景定位到owning container，不伪造位置。Stable identity使用catalog中的binding/registry/path/pointers/keyword，不含backend wording或line。

Machine v2 immutable schema只拥有generic evidence union；新增schema IDs/catalog进入sorted public catalog canonical SHA-256并改变expected `semanticRegistryFingerprint`、examples与artifact-set validator expectations。双向exact drift tests必须证明fingerprint按预期改变而canonical v2 schema bytes/URI不变，不能增加schema-specific fields或oneOf branches。

第二次独立parser可能造成duplicate-key verdict和pointer escaping漂移；直接公开engine errors或把structured data塞入message会把dependency/human wording变成product contract，均拒绝。

### Decision 8: Causal input closure统一changed与regression

Descriptor从实际binding execution graph为每个finding生成internal causal input closure：primary path始终存在；schema findings包含root与实际transitive local refs；instance findings再包含instance path。Changed membership由closure与resolved changed scope的交集唯一决定。因此referenced schema变化可让primary instance未变的新finding进入changed，且不需要伪造primary path。

Regression evaluator只能从changed current findings出发，并且只有explicit baseline时按stable evidence identity比较，保持`regressions ⊆ changed`与current ordering。Omitted baseline保持current-only；cache hit、Git history和reference graph都不产生comparison target。Closure不进入evidence或machine shape，foundation generic channel planner只消费descriptor给出的causal paths。

### Decision 9: Transitive closure拥有cache与comparison identity

Cache unit为binding+instance evaluation。Key包含dialect/rules、normalized binding、root及transitive referenced schema content fingerprints、instance fingerprint、relevantfile policy和internal implementation identity。Schema graph先按content-addressed nodes缓存compile-safe normalized result，再按binding/instance缓存evaluation；execution failures不缓存。Current/baseline共享config/rules snapshot但各自解析revision inputs，绝不读取remote state或推断baseline。

只hashroot schema会在referenced schema改变时复用stale verdict；hash全project会让无关文件失效，故使用reachable transitive closure。

### Decision 10: Public config升级延续v2 hard cut且保持tool-neutral

本change在`add-file-policy-overrides`建立的complete/closed v2 common check source上增加optional-but-complete schema base和只能patch已声明base的`enabled` partial patch，并同步runtime schema/type/default/init/editor/publication materials。V1继续拒绝unknown fields；不dual-read、不partial merge。Config只表达dialect、registry/selectors/bindings；engine、compile flags、remote client和backend options留在internal boundary。该shape必须与single-active v2原子交付，而不是在v1或另一个merge engine中实现。

## Risks / Trade-offs

- [2020-12 engine对recursive/dynamic refs支持不完整] → 阻塞审计用official conformance subset和targeted recursive fixtures验证；不满足则更换dependency或缩小已声明支持，不能静默fallback。
- [引用解析导致path escape、网络访问或credential泄漏] → resolver使用approved in-memory registry、root containment和deny-by-default schemes；credential canary同时监视filesystem/network为zero及message/log/evidence/stdout/stderr中raw ref、userinfo/query、token和digest为zero。
- [all-errors可能放大finding数量和CPU] → 明确per-instance error/work budget和deterministic truncation diagnostic；不得无提示丢弃findings。
- [pointer到source location映射对组合keywords并非总唯一] → schema pointer保持engine-evaluated keyword位置，instance missing-token定位owning container并明确语义。
- [transitive cache invalidation复杂] → 用显式reference graph/content hashes和cycle-aware traversal，tests覆盖diamond/cycle/unresolved/ref-change。
- [internal binding short-circuit误升为新public状态] → machine contract tests只接受root findings与existing capability result；human summary从internal plan+root finding派生且无portable字段。
- [并行prerequisite的config v2 shape可能漂移] → 首项阻塞审计对照最终per-file patch owner，必要时仅修订本change artifacts后再实施。

## Migration Plan

1. 完成并审计三个prerequisites，确认content machine v2、config v2/file patches与JSON parsed/location boundary已生效。
2. 在同一semantic config v2 owner中加入schema policy，更新neutral default/init/editor/schema/example/docs并保持v1 hard cut；先验证config conflict/failure paths。
3. 建立offline schema-engine boundary、2020-12 meta-schema registry、reference graph与dual-side diagnostics，以direct fixtures验证每个stage。
4. 注册capability descriptor并接入current/baseline、finding channels、gate、cache和machine/human output；完成formal CLI acceptance与security tests。
5. rollback只移除schema policy/capability并迁移v2 documents，不恢复v1、不开dual reader，也不保留engine-namedpublic fields。

## Open Questions

无未回答开放问题，可以进入实现前审计；具体schema engine只有在审计证明其履行2020-12、offline resolver与diagnostic contract后才可选定。
