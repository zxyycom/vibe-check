# Gate 结构与职责演进：教学场景候选证据

调查日期：2026-10-05 UTC。当前核对基线：`e1164d27177f4b4b010a0603ffe999ac6c98084d`。
本文件是 `261005-derive-gate-guide-scenarios-from-history` 的随附阅读资源，不是新 Investigation、当前 owner 或实施计划。

## 范围与依据

本资源按结构问题提炼教学场景，覆盖正式入口、执行 owner、共享准备、证明义务和组合可读性。先经 Investigation 入口查询并读取下列报告，再用路径限定 Git log/show 核对实际前后差异；当前组合入口先查 CodeGraph，再以源码补足 candidate-bound import 与 cleanup。

历史入口使用 `git log --all` 追踪，未切换版本。涉及证明边界时按测试策略与 Case owner 判断；flags、调度、聚合和诊断仅作为交叉边界。未执行历史版本、Gate、测试正文或性能实验，下文计时和通过数均来自历史记录。

完整读取并复用的既有报告（以稳定 ID 标识）：

| Investigation ID | 形成时结果与本轮用途 |
| --- | --- |
| [260901-diagnose-bun-cold-project-gate-candidate-import](../../diagnose-bun-cold-project-gate-candidate-import.md) | 观察已安装 candidate 与父进程 import 失败的区别，建议标准 env:setup 前置准备；提供 S1 支持范围背景。报告较强的 resolver 归因不能盖过后续复查。 |
| [260907-recheck-cold-candidate-bootstrap-gate-import](../../recheck-cold-candidate-bootstrap-gate-import.md) | 固定 `bb33371c65782c2ffe3decdac4cedfe44b8da69c`，三个 direct-cold formal Gate 失败、fresh-process warm 对照通过；最小 observer 又不支持“任何 prepare 后 import 均失败”。S1 据此保留根因未知与 ambient ancestor 条件。 |
| [260904-audit-project-gate-candidate-lifecycle-process-overhead](../../audit-project-gate-candidate-lifecycle-process-overhead.md) | full 图已有 shared artifact/external installation，但 detached lifecycle lane 再 build/install；局部采样显示编译/安装占大头。为 S4 提供已形成认识，不重新计时。 |
| [260904-audit-project-gate-validation-and-type-acceptance-overhead](../../audit-project-gate-validation-and-type-acceptance-overhead.md) | shared external provider 已避免三个 consumer 重装；tsgo 与 QuickInfo 是不同 proof；docs 存在多次 Bun 启动。S3/S4 不把已有正确共享误说成新优化。其建议当时未实施。 |

## S1：用同一运行图验证实际交付的包

**问题场景。** 仓库有独立命令 verifier，同时 Product 已提供 Project Run；运行 source 或另一个 package 安装可能掩盖发布包/入口接线错误。质量扫描还藏在外部命令启动的 nested Product Run 中，顶层不能直接呈现它的独立 Check。

**历史变化（已采用，后续继续修正）。**

1. `e8f1bf4b5872e791d0b456fbebc84081d50bfe8e` 的父版本：`scripts/vibe-check-workspace/verify/runner.ts::runVerification` 已使用 source `runTaskGraph`，不是“所有步骤纯串行”。它仍拥有另一套 task-to-command、结果与 report completion 模型。
2. 该提交建立独立命令 catalog 与 candidate-first adapter：`scripts/project-gate/index.ts::runProjectGate` 先 prepare，再动态 load；实际 `resolvedEntryPath` 不等于 prepared entry 就在 Product Run 前失败。
3. `33c60813ce9d8e2daf8d68766031af2f66c3e552` 的 `package.json` diff 将 retained root 验证命令切到 Gate，并删除旧 verifier。不是仅新增第二个入口。
4. `f59861e26597f7c0169ec96e00e2392fe2c1e1fc` 将四项 repository-quality ordinary Checks 放入同一个 Gate Run，替代继续在顶层隐藏质量 Run 的路线；该时的 observation/aggregate policy 后来演变，不能照搬。

**变化依据。** `e8f1…:changes/build-candidate-backed-project-gate/gate-readiness-handoff.md` 明确候选阶段 legacy 仍正式，需 cutover 授权、bindings 验证与回退边界。不能把候选已通过说成当时已生效。S1 的“避免两套模型”判断还由 root binding/删除 diff 支持，不只是 commit 标题。

**当前 owner 与修正边界。** [Project Gate](../../../tooling/project-gate.md) 的“组合配置与 candidate 绑定”；[Workspace](../../../tooling/workspace.md) 的“公开入口与私有使用方边界”“自举前提与效果”。当前入口为 `scripts/project/gate/run.ts`，不是历史路径。上述两份 cold import 报告表明“prepare 成功”不等于“父进程能导入正确 candidate”；当前标准支持范围是先 env:setup，不承诺未自举 cold Gate。S1 不证明 Bun resolver 的唯一根因。

**可迁移原则。** 一个运行图应使用被验收的 exact runtime；bootstrap/entry identity 属于调用 adapter，不能让业务 Checks 静态 import source 绕过。

**适用边界。** 早期 20-Check 固定数量、required/full/tag grammar、source scheduler 路径、quality observation policy 均非当前契约。更不能为“小例子”要求所有使用方都构建安装自己的包。

**候选例子。** 一个 project-owned adapter 与两项 ordinary Checks：外层接受“已准备 runtime entry”并核对 identity；内部一个独立 check 和一个 direct prerequisite consumer。用于解释组合与运行边界，避免塞入 scanner/发布/flags。

**验证重点。** entry mismatch 不开始 Product Run；help 不 prepare/import；bootstrap 已成功仍要重验 identity；两项检查各有自己的终态，不能以外层命令 exit 代替所有内层 facts。

复核命令：

```bash
git show e8f1bf4b5872e791d0b456fbebc84081d50bfe8e^:scripts/vibe-check-workspace/verify/runner.ts
git show e8f1bf4b5872e791d0b456fbebc84081d50bfe8e:scripts/project-gate/index.ts
git show 33c60813ce9d8e2daf8d68766031af2f66c3e552 -- package.json scripts/vibe-check-workspace
git show f59861e26597f7c0169ec96e00e2392fe2c1e1fc -- scripts/project/gate/definition.ts
```

## S2：按执行责任选择 native 或 process

**问题场景。** 初始 Gate catalog 把文档 validator、Decision、Test Evidence 等都作为 Bun 命令；同一次验证因此重复 root wrapper，并将领域 typed result 转成 stdout/exit 再读。另有已并入仓库的 Foundation 仍保留子包时期四项独立 Gates。

**历史变化（已采用，但领域实现继续演进）。** `e8e0387532756cdd2717852b20aabf16a33f3454`：删除旧 command catalog 的实体列表，`scripts/quality/project-gate/project-definition.ts::createProjectGateEntries` 组合 ordinary Check；`native-check.ts::createNativeOperationCheck` 直接调用 import-safe validator，process entry 对真实工具直接使用 invocation。删除 Foundation 独立 manifest/tsconfig 与四项 wrapper gates，让普通 workspace assurance 承担其 source/tests。

**变化依据。** 同版本 `docs/decisions/integrate-foundation-into-workspace-assurance.md` 描述四项 Gates 已重复 scripts typecheck/lint/format/Test Evidence，不存在已确认独立 package caller。native diff 显式保留 signal 检查、领域 failed 与运行不可用的不同终态，不能概括成“直接调用总是成功”。

**当前 owner。** [Workspace](../../../tooling/workspace.md) 的 process/shared capability 与 child-owner 表；[Project Gate](../../../tooling/project-gate.md) 的 native/process 边界。今天共享 scripts capabilities 本身不成为独立 package、Check 或 preset。领域 operation 仍由生产 owner 拥有。

**可迁移原则。** Check 的边界由独立用户结果决定，不是目录/历史包形态；可 import 的领域 operation 可以作为 native Check；真正工具与可取消 command 保持 process 证据。

**适用边界。** 删除 wrapper 不自动证明所有独有不变量已有覆盖。import-safe 不等于同步重活可取消；不能在 native callback 隐藏不可取消 install。旧 Docs validator 的单个 generic diagnostic 不是今天应复制的诊断设计。

**候选例子。** 并列两项：native manifest validator 返回安全 data；commandCheck 调用一个外部工具。重点是选择哪一层拥有 execution，而不是演示最大并发。

**验证重点。** import 模块不启动 CLI；验证失败与工具不可用不同；取消 signal 传递到真实 operation；移除 wrapper 后其独有行为有明确 owner，不能只数“少了四项 Gate”。

```bash
git show e8e0387532756cdd2717852b20aabf16a33f3454 -- scripts/quality/project-gate/project-definition.ts scripts/quality/project-gate/entries.ts
git show e8e0387532756cdd2717852b20aabf16a33f3454:scripts/quality/project-gate/native-check.ts
git show e8e0387532756cdd2717852b20aabf16a33f3454:docs/decisions/integrate-foundation-into-workspace-assurance.md
```

## S3：一次准备，多项独立验收——共享事实不共享判决

**问题场景。** Gate root 已准备 exact candidate，但 artifact/consumer 可能从 ambient state 重新发现材料；external consumer 的一次安装与 types/docs/runtime 多种验收塞在一个进程，难以区分安装与各领域的终态。

**历史变化（已采用）。**

- `2b12911ce5ad3005be427f6dad6b166a256d1602` 增加 `prepared-candidate-check.ts::createPreparedCandidateCheck`：把 root preparation 转成 closed versioned typed data，核对物理 artifact/hash/paths；artifact acceptance 通过受控环境消费，而不是重建。
- `5a156410a51412778f51bdee143eae96c1627be1` 将一个 consumer lane 拆成 types/documentation/runtime；`external-consumer-material-check.ts::createExternalConsumerMaterialCheck` 产生一次 external installation，三个消费者 direct-depend 于它。typed stdout 解析、exact artifact provenance、physical validation 与 outer lease cleanup 都是边界的一部分。
- 当前 `checks/prepared-candidate.ts`、`checks/external-consumer-material.ts`、`runtime/bound-run.ts` 保留这个结构，外层 `finally` cleanup，不把 invocation path 当 portable receipt。

**变化依据。** `5a156…:docs/decisions/split-external-consumer-acceptance-with-typed-provider-data.md` 指出安装后三个消费者只读，provider verdict 不替代 consumer acceptance，failure-injection fixture 不能共享 mutation。旧报告 `260904-audit-project-gate-validation-and-type-acceptance-overhead` 也确认三个 consumer 已共享一次安装；不能把它们说成三个重复 installer。

**当前 owner。** [Project Gate](../../../tooling/project-gate.md) 的“Prepared candidate data”；[依赖与数据](../../../guides/check-dependencies.md) 的 direct relations、parser 与 handoff 契约。

**可迁移原则。** 共享昂贵 operation，形成可验证的 provider facts；消费者保留独立结果/断言，声明 direct dependency，再解析数据。值解析与当前物理材料核对是两层，不让 parser 因 cleanup 成为时变逻辑。

**适用边界与 handoff 对照。** Gate 当前是 canonical data + path/provenance，不使用 `handoff: true`。`9d09b785cb734033fb4a669790a01e89187315b7` 增加 same-Run private-reference handoff，是产品能力，不是 Gate 已迁移事实。只有真实 Map/typed bytes 等不可 canonicalize reference 的消费者才需要它；它不提供 disposer、不授权传递读，不可发布。不能为讲类型而人为引入 handoff，或把 parser 推断当 runtime 授权。

**候选例子。** 一个 `build-manifest` provider 返回 `{version,digest,files}`，两个只读 consumers 分别检查摘要完整性和用户定义约束。另一个独立 handoff 小例子仅在确有 bytes reuse 时用 Map；不把两者做成强制“一条流水线”。

**验证重点。** producer 最多一次准备；消费者只在 direct prerequisite passed 后开始；malformed/版本不符 data 被拒；artifact 与 owned root provenance 不符在 spawn 前拒绝；任一 consumer fail 不篡改其他 consumer 的终态；结束/失败/取消后 cleanup 在最后一个 consumer 之后。

```bash
git show 2b12911ce5ad3005be427f6dad6b166a256d1602:scripts/project/gate/prepared-candidate-check.ts
git show 5a156410a51412778f51bdee143eae96c1627be1 -- scripts/project/gate/definition.ts scripts/project/gate/project-run.ts
git show 5a156410a51412778f51bdee143eae96c1627be1:scripts/project/gate/external-consumer-material-check.ts
git show 9d09b785cb734033fb4a669790a01e89187315b7 -- docs/guides/check-dependencies.md
```

## S4：按证明义务识别重复执行

**问题场景。** shared candidate 已在 root 准备，full 的 `tests-package-candidate` 却再用 detached fixture cold build/install 并执行 reinstall。旧调查认为局部并发 cap 无法删除物理成本；另见 docs 逐例 Bun start，types 的 tsgo 与 QuickInfo 被误认为可能重复。

**历史变化（实际采用，与调查建议并不完全相同）。** `fa4d45f50899b8f43bc7ba4d1f4f2999a1bf42be` 从 Gate Definition/lanes 移除 `tests-package-candidate`；routine candidate contract 归 supporting，真实 cold lifecycle 移至显式 `candidate.integration.ts` 与 root `package:candidate:integration`。documentation 例子与 machine Definition 改为一个 child 顺序 import，每例失败仍带 source path。安装 resolution probes 合并。

**变化依据。** candidate lifecycle 报告给出 root preparation→shared artifact/provider→consumer 图与 detached branch；其计时是局部采样，不能外推 full 竞争份额。validation/types 报告明确 tsgo 与 QuickInfo 是不同 proof，建议只接受等价 consolidation，不是授权删证据。

**不可忽略的实际差异。** 同提交 `install.ts` 删除 `assertJscpdEngineVersion` 和 `jscpd --version` 的执行，仅保留 probed manifest/version/bin existence 等检查；`type-acceptance.ts` 删除 TS LanguageService QuickInfo，改读 declaration 相邻 JSDoc。这不是自动等价：安装 manifest 版本不等于真实 engine 可执行版本，声明含文档不等于 hover 显示它。本轮确认的是证据对象改变，不在未审计现行 owner 的全部需求时断言当前缺 Bug/test，也不把旧报告的“保留所有 proof”当成实际已实现。

**当前 owner。** [Project Gate](../../../tooling/project-gate.md) 的 test partition；[测试策略](../../../testing/strategy.md) 与 [Case 维护](../../../testing/case-maintenance.md) 明确 Case 按行为/信号划分，provider execution reuse 不产生新测试目的。当前单独 physical integration 不是 routine `*.test.ts` Gate surface。

**可迁移原则。** 对每个昂贵重复项分别回答“同一事实再次证明”还是“不同失效模式”；将有价值的物理 integration 单独定位，并明确 routine 验收是否仍能证明调用方结果。

**适用边界。** 不承诺去重后固定 <5 秒；不以修改时间/删除 Check 名隐藏工作；不能因为工具相同就删除 QuickInfo，或把合并进程中的模块缓存/全局状态视为与 fresh process 等价。保留显式 integration 也不等于用户每次默认 Gate 都执行它。

**候选例子。** 一个 shared artifact provider + 两个轻量 acceptance，旁置显式 physical integration；展示“复用准备”与“独立失败注入”两种模式，不展示仓库完整 compiler/install 流程。

**验证重点。** routine path 不偷偷再 build/install；物理 integration 入口确能独立触发；每类 failure signal 保留可定位性；合并 runner 对环境、模块缓存、cleanup 的差异显式验收；删除的 engine/hover proof 若不再需要，须由当前 owner 明确，而不是用通过数量掩盖。

```bash
git show fa4d45f50899b8f43bc7ba4d1f4f2999a1bf42be -- scripts/project/gate/definition.ts scripts/project/gate/checks/test-execution/lanes.ts package.json
git show fa4d45f50899b8f43bc7ba4d1f4f2999a1bf42be -- scripts/package/candidate/install.ts scripts/package/candidate/external-consumer/type-acceptance.ts scripts/package/candidate/external-consumer/documentation.ts
```

## S5：公共 commandCheck 接管单命令生命周期，项目保留领域结算

**问题场景。** Gate 已有公共 commandCheck consumers，其余单命令仍由私有 adapter 管理 environment、spawn、取消、transcript、终态。两套实现增加维护与接入成本，但并非所有 process workflow 都可改成一条 shell。

**历史变化（已采用且有有意行为变化）。** `a41e4b96418b92735f2f704009cd55aaba64d114` 将剩余 22 个单命令 entry 迁移到 public `commandCheck`，删除私有通用 process implementation。`checks/entry-factories.ts::createProjectGateCommandEntry` 用 `dependsOn + resolveEnvironment` 注入 typed provider，`afterCommand` 交给 Gate settlement/projector。native Checks 不受强制迁移；ast-grep version + rule-tests 是保留的两步骤 workflow。

**变化依据。** 同版本 `changes/use-command-check-for-project-gate/proposal.md` 明确真实使用公共能力与消除重复 lifecycle，且列出旧无 timeout 命令新增 120 秒、保留 64 MiB/既有 30 秒、reason/transcript format 变化。这些是 adopted policy，不是纯机械重命名。

**当前 owner。** [commandCheck](../../../guides/command-check.md) 拥有 exact-empty default、numeric exit callback 条件、transcript-before-callback、output limit/timeout 等；[Project Gate](../../../tooling/project-gate.md) 拥有 Gate 显式 inherit、领域 failure projection 与多步骤例外。

**可迁移原则。** 公共机制拥有 process lifecycle；项目 code 拥有工具协议/解析、controlled dependency environment、领域 Records 与 verdict。使用真实 consumer 检验 API，不为 wrapper 保留第二套进程机制。

**适用边界。** Gate 的 inherit/transcript/64 MiB/120 秒是项目 policy，不是公共默认或最小指南必需值。不得用 shell/pipeline 绕过 single-command 契约；非完整 numeric exit 不调用 afterCommand；stdout 有 JSON 也不自动是可发布 safe data。

**候选例子。** 一个命令输出 closed JSON；afterCommand 验证并返回 typed data，第二项 check direct-depend。另一个更小例子仅 exit-code mapping，不要求 provider/parser。前者用于领域完成，后者用于现成工具接入。

**验证重点。** malformed dependency/environment 不启动 child；transcript final write 失败不进入 callback；timeout/cancel/output overflow 用 Product terminal mapping；nonzero complete exit 可由领域 callback 正确结算但不能伪造成功；环境与 raw child output 不被自动发布。

```bash
git show a41e4b96418b92735f2f704009cd55aaba64d114 -- scripts/project/gate/checks/entry-factories.ts scripts/project/gate/checks/test-execution/entries.ts
git show a41e4b96418b92735f2f704009cd55aaba64d114:changes/use-command-check-for-project-gate/proposal.md
```

## S6：保持组合 manifest 可读

**问题场景。** 完整 Gate selection/顺序/资源声明被分组 assembly 函数、commonEntry 包装和事后 `withProjectGateResourceClaims` 分散。按函数行数拆分虽降低局部 metric，却可能增加恢复完整组合的阅读成本。

**历史变化（采用，并保留边界）。** `84c44124efbbdbe947184458898ea0e5659f44db` 先固定 `definition.ts / run.ts / checks / runtime` 布局；`9cd1238dab7cfcdd904c6ed307fb14a159a8f4a9` 再把完整 ordered manifest 放回 `createProjectGateEntries`，普通 metadata 直接声明，删除 commonEntry 等无语义薄包装。`runtime/entries.ts::defineProjectGateEntries` 在受控 normalization 边界冻结并投影 mutex/resourceClaims；领域 options 与 test lane 闭合组仍归领域 owner。不是“所有源码合成一个文件”。

**变化依据。** `9cd123…` 实际 diff 删除多组 assembly 和后加资源函数，新增 entry declaration type 与统一 projection；同版本 repository-quality 为 `createProjectGateEntries` 的 code-density Finding 增加精确 path/function/startLine/metric waiver，理由明确完整清单低分支，拆分会隐藏顺序/选择。

**当前 owner。** [Project Gate](../../../tooling/project-gate.md) 的“组合配置与 candidate 绑定”“Gate manifest 的函数行数 Finding”。当前 waiver 仍保留原 Finding，并让 stale/unused identity 可观察；未豁免其它函数/指标。

**可迁移原则。** 共享抽象应承担真实验证/转换义务；中央 composition 要能沿单一路径恢复完整配置，领域 mechanics 不为单文件形式复制。

**适用边界。** 大函数不自动值得 waiver；需区分声明密度与复杂控制/失败恢复。统一 normalization 也不能偷偷覆盖 owner 的 selection/资源语义。小教学例子不应先制造自己的 Gate-entry DSL；普通 `defineConfig` 足够时直接用它。

**候选例子。** 作为 authoring 教学的两份对照：三项 plain Check 的显式 manifest，与隐藏在 wrapper 的等价版本；要求读者恢复依赖/顺序，展示只有验证边界才有价值的 wrapper。更适合维护指南或设计旁注，不宜挤进产品最小运行示例。

**验证重点。** Check identity、顺序、关系与 selection 语义不变；metadata 冻结后 author mutation 不影响运行；重复/self/missing target fail closed；领域 policy 不被 projection 覆盖；waiver 精确命中且失效可见。

```bash
git show 84c44124efbbdbe947184458898ea0e5659f44db -- scripts/project/gate/definition.ts scripts/project/gate/runtime/bound-run.ts
git show 9cd1238dab7cfcdd904c6ed307fb14a159a8f4a9 -- scripts/project/gate/definition.ts scripts/project/gate/runtime/entries.ts scripts/project/gate/checks/entry-factories.ts scripts/project/gate/checks/repository-quality.ts
```

## 选例与复核

S2（native/process）、S3（typed provider）和 S5（command completion）适合作为不同用户任务的小例子；S1 适合项目集成旁注，S4 适合证明义务审计，S6 适合组合可读性说明。

交叉阅读：S1 的结果聚合见 R5；S3 的依赖选择见 F1，handoff 保持为独立产品对照；S6 的资源约束见 R2。S4 的去重须回到当前 owner 比较用户结果。

本轮读取了上述 commit/path 的 blob/diff，并以 `git cat-file -e <sha>^{commit}` 及 blob existence 检查核对完整 SHA、历史路径和父版本。历史路径用代码与 Git 命令保存；这些检查证明定位有效，不证明今天能重跑历史命令。集合与材料验证统一记录在主报告。
