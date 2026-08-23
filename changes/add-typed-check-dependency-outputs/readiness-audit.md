# Readiness Audit

本文件只保存形成Plan时的current baseline、consumer audit、Test Evidence audit与isolated prototype evidence。Planned API与架构以[`design.md`](design.md)为唯一owner；本文件不重新定义契约，也不证明产品已经实现。

## Current Baseline

### Runtime facts

- [`src/product/definition/custom-check.ts`](../../src/product/definition/custom-check.ts)与Check tree确认：`dependsOn`是exact/inherit string collection；`defineCheck`当前只改善literal/options contextual typing。
- [`src/product/run/check-execution.ts`](../../src/product/run/check-execution.ts)确认：Run在Check settle为`unavailable`后抛`CheckUnavailableSignal`，dependent被blocked并得到`prerequisite-unavailable`。
- [`docs/quality-metrics.md`](../../docs/quality-metrics.md)与Core确认：`passed` / `failed`有canonical final data；`not-applicable` / `unavailable`无data；Records是独立supplemental facts。
- [`docs/output.md`](../../docs/output.md)确认：RunResult/machine已经投影Check final data；新reader不需要machine schema或第三Core entity。

### Data boundary

Author callback返回ordinary JavaScript object。Core settlement调用`canonicalizeJsonObject`，重新materialize为detached、null-prototype、deep-frozen runtime object；它不是author原引用或JSON text。Machine publication需要bytes时才序列化。

因此provider parser必须接收`CanonicalJsonObject`。TypeScript generic只能同步provider声明，不能证明JavaScript/cast、历史artifact、版本漂移或business shape。

### Decision state

- [`read-direct-dependency-final-data-by-string.md`](../../docs/decisions/read-direct-dependency-final-data-by-string.md)已通过`decision-records evolve`成为`active + unaligned`successor，并固定string getter、direct runtime authorization、producer-local parser relation和四态settlement。
- Predecessor `let-dependent-checks-read-settled-upstream-outputs.md`已归档到[`docs/decisions/archive/`](../../docs/decisions/archive/let-dependent-checks-read-settled-upstream-outputs.md)，只保存旧Records/cross-Check parser方向的形成时事实。
- Four-state final data、Core Check/Record facts、ordinary`defineCheck`和minimal public runtime roots已经是current baseline。
- `bun run decisions -- check`已验证Decision索引、关系与schema。Plan stage不提前改变alignment；只有implementation与stable owners闭合后才能对齐。

## Consumer Audit

Repository search得到：

1. `project.changedFiles`是existing invocation fact；本Change的changed-files fixture只证明one producer、multiple consumers和external parser readback，不迁移该field。
2. Default Checks产生supplemental Records，但没有dependent callback按Record ID读取。
3. Project Gate当前`dependsOn`只表达ordering；future optimization可以消费implemented final-data reader，但不能扩大首版scope。

结论：首版只读取primary final data。不存在支持Record getter、query、parser registry或execution-input cleanup的named consumer evidence。

## Test Evidence Audit

修改测试前已运行`bun run test-evidence -- check --root .`；144/144 entities、45 Cases与10 Topics完整。现有Case足以承接本Change，不创建只因实现结构变化而重复证明同一行为的新Case：

| Planned evidence | Case owner | 实施时的Case动作 |
| --- | --- | --- |
| Public provider typing、Definition parser grammar与existing authoring compatibility | [`WB-PROJECT-DEFINITION-001`](../../docs/testing/cases/scan-configuration.md#case-wb-project-definition-001-recursive-project-definition-authoring-fails-closed) | 扩展同一public authoring/validation Case，加入positive/negative type fixtures、snapshot/fingerprint exclusion与emitted parser proof。 |
| Direct-ID authorization、two-error getter与four-state admission | [`WB-RUNTIME-CHECK-ORCHESTRATION-001`](../../docs/testing/cases/quality-runtime.md#case-wb-runtime-check-orchestration-001-direct-dependencies-run-through-the-shared-graph) | 保留Case ID；语义替换当前implicit unavailable blocking proof，并重命名受影响test entity。 |
| Same canonical reference与package-private settled read seam | [`WB-RUNTIME-CHECKPOINT-001`](../../docs/testing/cases/quality-runtime.md#case-wb-runtime-checkpoint-001-frozen-core-snapshot-is-a-two-entity-projection) | 在existing Core-facts Case增加read seam、identity与freeze evidence，不建立第三事实源。 |
| Cancellation-before-start与null duration | [`WB-RUNTIME-CHECK-DURATION-001`](../../docs/testing/cases/quality-runtime.md#case-wb-runtime-check-duration-001-product-run-closes-private-lifecycle-and-duration-facts) | 移除ordinary unavailable blocked假设，保留真正未启动边界；generic task blocking仍由`AUX-PARALLEL-RUNNER-001`拥有。 |
| Candidate declaration与ancestry-external installed consumer | [`AUX-PACKAGE-CANDIDATE-001`](../../docs/testing/cases/repository-tooling.md#case-aux-package-candidate-001-candidate-preparation-builds-one-auditable-physical-package) | 增加typed provider、string getter、declaration emit与external readback；不得依赖ancestry import或cast。 |
| Machine v4 schema保持不变 | [`WB-OUTPUT-MACHINE-V4-CONTRACT-001`](../../docs/testing/cases/report-output.md#case-wb-output-machine-v4-contract-001-machine-v4-publication-contract) | 只登记schema/final-data projection不变的output proof；version-matched external parser readback归package Case，避免重复证明。 |

Generic Task engine的ordering、cancellation与true task-failure blocking继续由[`AUX-PARALLEL-RUNNER-001`](../../docs/testing/cases/repository-tooling.md#case-aux-parallel-runner-001-static-task-engine-保持通用调度契约)拥有；本Change只删除Product把ordinary`unavailable`翻译成Task failure的适配。

## TypeScript Prototype

在隔离的非repository工作区使用repository锁定`tsgo`验证了以下关系，没有写入product源码：

```text
parseData(CanonicalJsonObject): Data
  -> Data inference anchor
  -> execution(): CheckResult<NoInfer<Data>>

dependencies.get(checkId: string)
  -> non-generic canonical read
  -> consumer explicitly calls producer.parseData(read.data)
```

### Verified cases

- Parser存在时，defined Check和emitted declaration中的`parseData`保持required。
- Parser-return`ChangedFilesData`约束同一Check的execution data；错误shape被typecheck拒绝。
- Consumer在getter success narrowing后显式调用parser并恢复files type。
- Options/no-options、ordinary no-parser Check与identity/type-anchor parser形态可以共存。
- Declaration emit后，isolated external consumer仍恢复parser return和options types。

### Commands and results

```text
bun x --no-install tsgo --ignoreConfig --strict --target esnext \
  --module nodenext --moduleResolution nodenext --noEmit <prototype.ts>

bun x --no-install tsgo --ignoreConfig --strict --target esnext \
  --module nodenext --moduleResolution nodenext --declaration \
  --emitDeclarationOnly <prototype.ts>

bun x --no-install tsgo --ignoreConfig --strict --target esnext \
  --module nodenext --moduleResolution nodenext --noEmit <external-consumer.ts>
```

Positive checks均以exit code`0`结束；provider mismatch negative check以exit code`1`结束。Prototype fallback overload的negative diagnostic可能退化为“`parseData`不属于ordinary Check”，所以implementation必须验收diagnostic readability，不能只验收failure。

Prototype files不作为repository evidence保留。Repository-owned fixtures、candidate declarations、runtime tests和installed consumer仍是implementation requirements。

## Evidence Boundary

本Audit已经证明：current facts支持该范围，Decision与Test Evidence owners已经闭合，string getter与provider-local generic在TypeScript中可行，首版不需要Record variant。

本Audit尚未证明：Definition grammar、Core read seam、Run getter、four-state admission、package declarations、external runtime或stable docs已经实现。对应工作只以[`tasks.md`](tasks.md)完成状态和实际validation为准。
