# Tasks

任务先建立可验证的 registry/binding 与严格资源边界，再完成 schema/instance execution、records和证据闭合。

## Readiness

- [x] 0.1 已将 proposal、design和tasks核对为同一 2020-12 offline validation目标，并按活动决策统一使用 Project Definition、CheckResult和QualityRecord。
- [x] 0.2 已核对当前 Ajv只由docs/tests tooling通过pinned devDependency使用、Product runtime尚未import，且已核对docs owners、`src/product/**`实现及五个前置Changes；当前事实、未来基础和本Change判断已在design中分开。
- [x] 0.3 已固定bounded safe schema/binding IDs、registry/binding/Schema-owned `maximumBytes` shape、claimed-path owner、五个record types及schema/instance document defect分流、registered-URI-first resolver与redaction、单个预建Task内的closure/短路、transitive comparison/cache和验收矩阵；没有阻塞实施的问题。

## Implementation

- [ ] 1.1 在基础ports和strict JSON service可用后，注册`json-schema-validation` CheckDefinition、五个record type和private binding，并实现Project Definition registry/binding与Schema-owned `maximumBytes` normalization、按approved path的file-policy override、claimed-path arbitration和pre-work conflict diagnostics；schema/binding IDs必须分别唯一、为1..64字符ASCII lower-kebab，binding `schemaId`只引用safe registry ID，resolved limit必须保持在`1..67108864`且不能扩大inventory/claimed paths。
- [ ] 1.2 按测试证据流程先建立schema/instance document defect、dialect/reference/keyword-violation证据，再实现shared JSON parse handoff及role-specific record映射：schema bytes defects进入`json-schema-invalid`，instance bytes defects进入`json-schema-instance`，每次read显式传入该path的resolved limit；随后实现schema-engine private boundary、meta-validation、compile和双侧pointer/location normalization。
- [ ] 1.3 实现registered-URI-first、project-contained、zero-network resolver与bounded reference graph：精确命中的HTTP(S)等registered identity只读取approved in-memory resource，未注册remote identity才`remote-disabled`，并闭合duplicate registered identity与invalid base URI records；用credential canary保证raw `$id`/reference/userinfo/query/token及其digest不进入任何persistent或user-visible boundary。
- [ ] 1.4 构造只含一个预建Check-owned task的frozen TaskPlan，在task内部按per-path limit完成registry-only closure、meta-validation/compile、dependent domain short-circuit和bound instance evaluation，不动态新增Task/edge；随后完成CheckResult/CheckRun、五类records、transitive named-reference matching和两层cache。
- [ ] 1.5 审计候选Ajv engine的Bun/installed runtime、capability与license，并把最终engine归入正确Product runtime dependency/lockfile；同步Project Definition authoring/starter、Architecture、Configuration、Scan Scope、Output、dependency/package边界、测试Cases、canonical Check/Record materials和consumer docs。

## Verification

- [ ] 2.1 运行最窄config/registry/maximumBytes、strict document、2020-12 conformance、compile/ref/instance、TaskPlan、record identity、comparison/cache和正式CLI tests；覆盖schema/binding ID的empty、长度边界、非ASCII、大小写、leading digit、重复/连续/尾部hyphen与unknown safe `schemaId`，并覆盖schema与instance各自的invalid-json/duplicate-key/unsupported-input、default/range/per-path override、duplicate registered identity、invalid base、registered HTTP(S) identity离线命中、unregistered remote/local/outside/fragment/cycle、missing property和独立closure；证明public records/identity只使用authoring IDs、不含`$id`/URI，TaskPlan始终只有预建task且运行期refs不新增Task/edge。
- [ ] 2.2 运行网络/DNS零调用与credential canary、Product runtime dependency/installed candidate、`bun run test-evidence:check`、product import/typecheck/lint/tests、`bun run validate`和`bun run verify:vibe-check-workspace:required`。
- [ ] 2.3 复核schema/instance document defects保持正确record owner、transitive schema或per-path limit变化只失效相关binding、普通JSON无重复records、registered URI永不授权网络、输出无raw `$id`/refs/absolute/backend数据，且Success Criteria与owner同步均有证据；未经明确授权不转换阶段或归档。
