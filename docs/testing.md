# 测试策略

本文定义 Vibe Check 自动化测试的层级、所有权、fixture 边界、统一验证入口和一致性审计
规则。测试证据由以下项目材料维护：

- [测试证据维护](testing/case-maintenance.md)：当前测试实体发现、语义 Case、fixture
  证明目标和全树闭合的维护流程。
- `docs/testing/cases/`：受控 topic 与人工维护的语义 Case source；不提交派生实体清单
  或查询索引。

稳定 CLI、scan scope、metrics、warning、baseline、gate、process outcome、artifact 和
output 语义以
[文档导航](navigation.md#如何阅读这些文档) 指向的 owner 文档为准。测试文档只记录证明目标、
测试归属和验收边界。

## 实施状态

产品测试 owner 位于 `src/product/**`，测试对象是仓库自有 TypeScript/Bun source、正式
product entry 和外部 scanner adapters。迁移后的 quality-core tests / fixtures 位于
`src/product/quality-core/**`；可由正式入口扫描的 reusable external project fixture 位于
`fixtures/projects/**`。`docs/testing/cases/**` 按共同 owner 契约与可观察结果把当前
test entities 映射到语义证明目标。

Rust tests / fixtures 已随 Rust 产品删除，不迁移、复制、改写或逐项映射到 TypeScript
产品。新增 coverage、scanner characterization 或既有缺陷修复进入独立 change，不回填
已删除的 Rust 证明资产。

## 测试层级

| 层级 | 核心目标 |
| --- | --- |
| 文档 / schema | Markdown links、current JSON Schema 2020-12 strict compile、五组 canonical machine sets 的 independent acceptance、schema/example generation drift；历史 report materials 分离验证 |
| Product unit | TypeScript model、completeness/gate reducer、file collection、scanner parser/wrapper、aggregation、baseline/cache、warning 和 output helper 的自定义不变量 |
| Product entry | 通过正式 `product:cli` 与 dogfood wrapper 验证 project root、flags、scan plan、console、process outcome、completeness、gate 和 artifacts 到达同一 core |
| Script consumer | Quality dogfood、strict all-or-nothing annotation consumer、workspace verifier 和其它 `scripts/**` consumer 只透传或消费产品 behavior，不成为第二套产品实现 |
| Productization parity | 一次性证明上移前 pinned consumer 与当前产品入口在 quick、full、baseline 和 explicit changed-files 下等价 |
| 综合验证 | docs、长期决策、目标 Change Plan、TypeScript product/tooling、quality dogfood 和 workspace gates 证明交付边界没有漂移 |

当前 workspace verifier 使用 TypeScript product checks，不保留空跑或不可达的 Rust /
Cargo 产品 gate。

## 测试所有权

测试按“用户可观察 contract”和“自定义逻辑不变量”划分。一个行为只有在证明不同责任时
才跨层测试：

- Product unit tests 证明 normalized model、parser、ordering、cache identity、warning
  algorithm、GateResult evaluation 和 output projection。
- Product entry tests 证明正式 command、configuration selection/init、gate process outcome 与
  dogfood wrapper 的外部行为。
- Productization parity 已一次性证明源码位置和入口改变没有修改 TypeScript behavior。
- Workspace validation 证明 consumer、docs 和 automation 接线仍可工作。

历史回归只作为风险线索，不自动成为新 proof target。新增断言前必须能写出“owner 承诺的
语义 -> 可观察结果”，并追溯到当前 owner、现有 TypeScript behavior 或明确 change
requirement。

已有缺陷或 coverage 缺口进入后续 change，不借 owner 搬移改变既有测试范围或预期结果。

Semantic config evidence 按 owner boundary 分层。Product tests 证明
[Configuration](configuration.md) 定义的 neutral default、embedded semantic/document schema、
strict/annotated Vibe Check JSON equivalence、detached mapping、selection、CLI precedence、gate
file prerequisite、legacy hard cut、repeat ensure / initializer ownership 与 `ScannerDependencySnapshot`
separation。Docs validation 对 [`vibe-check-config.schema.json`](schemas/vibe-check-config.schema.json)
和唯一 [`vibe-check-config.json`](examples/json/vibe-check-config.json) 执行 generation drift 与
independent acceptance；它不把 generated sibling editor schema 提升为 runtime authority。
Formal entry 与 dogfood evidence 只证明 public workflow 到达这些 Product boundaries，不复制
Configuration 的 exact neutral value 或 selection contract。

## Machine output proof layers

Machine behavior contract 由 [Output](output.md) 拥有；tests 按不同 observable boundary 分层，
不按每个 public field 建立独立 Case：

1. Runtime schema/projection tests 证明唯一 current identities、canonical paths/URNs、
   schema-derived DTO field inventory、explicit Core-to-DTO mapper 与 one-warning-mapper
   boundary。
2. Serializer/validator tests 证明 metrics/warning positive byte grammar，以及
   decoding/framing/syntax/schema failure 的 all-or-nothing typed result 与 actionable
   locations。
3. Artifact-set tests 证明 stream/channel deep equality、warning subsequences、stable
   capability exact membership/completeness reduction 与 evaluated-gate invariants。
4. Publication tests 证明 candidate validation precedes canonical writes、prior/handled
   cleanup、same-directory temp/rename behavior、trusted-path timing 与 output exit priority；
   它们不把 publication 误报为 multi-file transaction。
5. Formal entry outcome tests 对 complete-passed、complete-warning、legitimate-empty、
   gate-failed、scan-incomplete 和 controlled output failure 读取原始 machine bytes，并调用
   production artifact-set validator。Contract-valid scan-incomplete 与 output-contract failure
   都可产生 exit `2`，但前者有 valid set，后者没有 trusted published set。

Independent docs acceptance 不 import Product validator。它从 checked-in current schemas 与
raw canonical example bytes 独立执行 strict schema compile、UTF-8/framing/schema 与全部
set-invariant checks，并覆盖 focused accepted/rejected mutations。另一个 deterministic drift
proof 比较 runtime-derived schemas/examples 与 checked-in files；任一 drift 使 owning docs
check 失败。Current traversal 精确包含五组 `docs/examples/artifacts/**` sets，不包含
`vibe-check.report.v1` historical examples。

### Producer-to-consumer acceptance

Required acceptance 使用实际 package boundaries，而不是 test-only parser：

- Formal Product CLI 在隔离的 existing project fixture copies 中生成 non-empty 与 zero-byte
  current warning streams。
- Actual `quality:annotate` package CLI 消费两者并退出 `0`。
- Acceptance 从 valid producer record 派生代表性 schema-invalid suffix，证明同一 Product
  warning-stream validator 返回 exit `2`、stderr 有 line/pointer diagnostic，且 stdout 不含
  valid-prefix partial annotation。
- Required workspace profile 精确调度这个 focused test child；workspace verifier 只传播
  child result/output，不复制 artifact parser、schema registry 或 warning mapper。

相关 semantic Cases 继续按共同 owner contract 与可观察结果划分：一个 entity 可以支持多个
Case，一个 Case 可以映射多个 entities；不得把 schema fields 当成 Case inventory。

## Product unit tests

当前 TypeScript tests 继续证明其职责。`docs/testing/cases/**` 覆盖的直接资产包括：

- `measurement/scanners.test.ts`：scc by-file CSV、Lizard CSV、jscpd version/report parser，
  以及 jscpd unavailable / execution / report / parse failure。
- `model/scan-completeness.test.ts`：stable current capability IDs，以及 shared reducer 对
  succeeded、mixed、empty 和 failed results 的归约。
- `model/gate-policy.test.ts` 与 `model/gate-evaluator.test.ts`：descriptor-derived policy、
  discriminated GateResult validation、prerequisite priority、selected channel、accepted
  warning 和 blocking ordering。
- `engine.test.ts`：final warnings / GateResult、artifact validation priority、process outcome
  和 verification preview orthogonality。
- `scan-command/command-output.test.ts`：disabled/evaluated/not-evaluated console projection
  与 stdout/stderr boundary。
- `measurement/current-revision/current-revision.test.ts`：current capability wrappers 的
  successful zero result 与 unavailable / execution / invalid-result failure projection。
- `measurement/scanners/jscpd/area-scans.test.ts`：per-code-area task planning、稳定 task /
  file ordering、current failure collection 和 baseline throw behavior。
- `measurement/cache.test.ts`：duplicate 与 baseline cache identity、cache hit 和 snapshot
  integrity。
- `input/files.test.ts`：file fingerprint、Git pathspec、explicit changed-files
  路径/错误边界，以及 current/baseline Git collection 与 config-only fallback。
- `output/warnings/generator.test.ts`：file/function/duplicate thresholds、changed/regression
  channels 和 accepted warning behavior。
- `output/report/markdown-report.test.ts`：ranking、changed-file summary、metric labels、
  accepted reason 与 requested-gate placement/action。
- `output/machine/machine-output.test.ts`、`validation.test.ts` 与 `publication.test.ts`：
  schema/DTO projection、serializers、byte grammar、artifact-set predicates 与 validated
  publication failure boundaries。
- `config-schema.test.ts`、`config-validation.test.ts`、`config-document.test.ts`、
  `config-file.test.ts`、`config-selection.test.ts`、`config-init.test.ts`、
  `scanner-dependencies.test.ts` 与 `args.test.ts`：semantic/document schema、Vibe Check JSON、
  `ResolvedQualityConfig` mapping、config selection、repeat init / ownership、legacy hard cut、
  `ScannerDependencySnapshot` resolution、option presence 与 gate parser/help/scan-plan
  normalization。

这些 tests 只依赖 Vibe Check-owned models。scc CSV row、Lizard CSV row 和 jscpd reporter
objects 可以作为 parser fixture 输入，但不得成为 Core / Output contract。

### 代码组织

- 小型 test 与实现保持现有相邻 `.test.ts` 结构。
- Fixture/helper 遮蔽 proof target 时，按已有分组组织，不为路径移动重构 test
  architecture。
- 单个 test 保持一个自定义不变量或一个外部 contract dimension。
- Production export 不得只为迁移后的白盒 test 扩大；沿用现有 public source entrypoint 和
  module visibility。
- Async process tests 必须观察 Promise、退出状态和 artifact；不得依赖未处理 rejection 或
  环境泄漏。

## Scanner fixtures

现有 TypeScript scanner tests / fixtures 作为一个整体随 pinned source 上移。它们继续
证明：

- scc/Lizard/jscpd parser 的当前 normalized output。
- jscpd real duplicate scan 和 failure projection。
- `ScannerDependencySnapshot` / eligibility、cache/fingerprint、changed-files 和 report/warning
  behavior。

Rust CLI project fixtures 和 Rust dependency / grammar characterization fixtures 已删除。
它们不是 TypeScript behavior source，也不得被复制到 `src/product/**` 作为“补齐”。若
现有 TypeScript test 无法证明某个长期 contract，先把缺口记录为后续 change。

可由正式入口扫描的 external project fixture 与 unit/scanner protocol support 分开：
`fixtures/projects/configured-typescript/` 提供 complete semantic project material、
eligible/excluded/generated source 与受控 scanner support。Configuration workflow acceptance 在
isolated temporary copies 中建立 clean、initialized、partially initialized、discovered 或 explicit
state，再通过正式 Product CLI 证明 source selection 进入同一个 scope/scan pipeline。受控
executable 只通过 operational overrides 到达 `ScannerDependencySnapshot`，不进入 semantic
document，也不定义稳定 Core/Output contract。

Gate acceptance 复用同一 checked-in fixture，不新增平行 project fixture：
`src/product/cli-omitted-gate-baseline.test.ts` 固定 omitted request 的既有行为；
`src/product/cli-gate-acceptance.test.ts` 在临时 copy 中建立受控 Git comparison，证明
quick `all`、all-only warning、input-unchanged、changed non-regression、regression 和缺少显式
baseline 的 pre-work failure。Invalid baseline 与 revision canonicalization 由 formal pre-work
acceptance 证明；显式 baseline 接受后的 runtime comparison unavailable、accepted/mixed warning、
empty/incomplete 与 output failure 由 evaluator/engine tests 证明，formal entry 不复制同一组合矩阵。

## 一次性 productization parity evidence

初次产品化验收使用迁移后的现有 TypeScript fixture material 建立隔离 Git project，固定：

- baseline commit。
- current commit。
- explicit changed-files input。
- invocation-owned `ScannerDependencySnapshot` 与 `ResolvedQualityConfig`。

上移前 pinned consumer 与当时的 product entry 扫描同一个 fixture project。Quick、full、
当时支持的 `--with-baseline` 和 explicit changed-files runs 已完成一次性比较；这段历史证据
不定义当前 CLI flags：

- metrics、aggregates 和 fingerprints。
- baseline / comparison status 与 trends。
- all / changed / regression warnings。
- report、warnings 和 raw scanner artifacts。
- console completion 与 final status。

该验收只忽略源码位置、入口名、时间戳、绝对 root path 和明确记录的工具环境 metadata。
Parity fixture 只用于证明搬移，不扩展 scanner feature coverage；完成产品化后，它不是
日常验证或每次产品变更都要重跑的固定 gate。

## Product entry and dogfood tests

入口 tests 必须证明：

- `bun run product:cli -- scan [project-root]` 到达唯一 product core。
- `bun run product:cli -- init [project-root]` 只确保 Product Config 拥有的 discovery paths
  存在，不启动 scan work；重复执行保留 existing target bytes，并只补齐 missing target。
- 省略 project root 时使用启动 cwd。
- `scripts/quality/scan.ts` 与 `quality:check`、`quality:full-check`、`quality:scan`、
  `quality:gate` 只作为单向 wrapper，并显式传入 Vibe Check repository root；前三个
  package invocations 保持 omitted gate，`quality:full-check` 也是无 baseline 的 current full
  snapshot；`quality:gate` 固定 full `regressions` request，但只透明接收调用者显式
  `--baseline <revision>`。
- 正式入口与 wrapper 保持 product-owned flags、profile、gate、console、artifact 和 process
  status mapping。
- Configuration acceptance 使用 isolated external project copies 证明 neutral observation、
  file-backed gate prerequisite、repeat init、single-file fill、discovery、explicit precedence、
  invalid selected document 与 sibling-schema independence；行为细节和安全边界只引用
  [Configuration](configuration.md)，本 owner 只分配 proof responsibility。
- Dependency acceptance 证明 supported operational overrides 只进入 `ScannerDependencySnapshot`；invalid
  `_ARGS` exit `2` 发生在 banner/cache/artifacts 前，而 skipped/no-input capability 不探测或启动
  executable。
- Formal entry 对代表性的 complete、legitimate empty 与 required component unavailable
  scan，证明 core outcome、console conclusion、`metrics.json`、`report.md` 和 CLI exit
  投影同一 completeness source。
- Formal gate entry 对 disabled、evaluated passed/failed 与 comparison not-evaluated
  representative branches，证明 GateResult、warning streams、report/console 和 exit
  `0` / `1` / `2` 使用同一 evidence；formal tests 还以原始 bytes 调用 production
  artifact-set validator。Missing/empty/duplicate/invalid baseline、retired auto-baseline flag 与
  profile/skip conflicts 独立证明 exit `3`，且不选择 config、不启动 scanner/cache 或创建
  artifacts；成功输入证明 raw revision 在一次 invocation 中固定为一个 full commit OID。
- Product runtime import closure 不反向导入 `scripts/**` 或 toolkit gitlink。

入口 tests 不需要为每个 flag 或 scanner failure kind 复制完整 matrix；result union、
reducer 和 adapter mapping 由 unit tests 证明，正式入口只选择能证明 routing、root、
cross-surface mapping 和 output 边界的代表性路径。

## 脚本与工具依赖

验证脚本和按需工具的安装方式由 [脚本工具](script-tooling.md) 拥有。本节只定义测试
边界：

- `bun run typecheck:scripts` 和 `bun run lint:scripts` 继续验证尚留在 `scripts/**` 的
  consumers / wrappers，不代替 product typecheck、lint 和 test。
- `quality:check` / `quality:full-check` / `quality:scan` 省略 gate，`quality:gate` 显式请求
  full `regressions` 并要求调用者透传 baseline；它们均让 Product Config 从显式 repository
  root 发现同一 checked-in policy，再调用 `src/product/**` 的同一 core。Wrapper 不推断
  comparison target。
- Foundation 只复制 product runtime 实际可达的 helper；仍在 submodule 中的开发 helper
  tests 不因此成为 product tests。
- 新 checkout、Bun、pnpm 和 external scanner installation requirements 由 script tooling
  owner 维护。

## 统一验证入口

文档先行阶段至少运行：

```bash
bun run validate:docs
bun run test-evidence:check
bun run validate
```

TypeScript 产品交付验证按改动面覆盖：

- product import boundary。
- product typecheck、lint 和 tests。
- current schema/example generation drift 与 independent docs acceptance。
- focused formal-producer-to-actual-annotation acceptance；它属于 required workspace profile。
- `bun run quality:check`。
- `bun run quality:full-check`。
- `bun run quality:gate -- --baseline <revision>`。
- `bun run quality:scan`。
- `bun run verify:vibe-check-workspace:full`。

局部改动可以先运行更窄的 tests，但跨源码所有权、产品入口、scanner adapters 和
artifacts 的交付必须运行相应 product tests、dogfood 和 workspace verification。一次性
productization parity 已完成，不属于日常统一验证入口。无法运行的验证要记录具体命令、
原因和残余风险。

## 一致性审计

交付前检查：

1. 新增、删除或移动的 tests 能追溯到 owner 文档或明确 change requirement。
2. 已迁移 TypeScript tests / fixtures 的证明目标和 test-evidence case 映射保持可追溯。
3. 已删除的 Rust tests / fixtures 没有进入 `src/product/**`。
4. 测试文档不重新定义 threshold、warning、baseline、artifact 或 status。
5. 完整当前 Bun test entity 集合全部进入至少一个真实语义 Case；每个 Case 只引用当前
   实体，Owner、Proves、Case ID、topic 和 source 结构合法，且没有模板 Case 或派生清单。
6. Completeness tests 分层证明 model/reducer、adapter result 和 formal-entry
   cross-surface mapping，不靠重复同一 scanner matrix 获得覆盖数量。
7. Scanner raw fixture 只证明 adapter protocol，不成为 stable output model。
8. External project fixture 位于 `fixtures/projects/**`，不与 product unit fixture 混合。
9. Gate proof targets 按 descriptor/evaluator、CLI planning/usage、core/output 和 formal-entry
   层级分配，不按 policy/status 做笛卡尔复制。
10. 发现既有缺陷或 coverage gap 时进入后续 change。
11. Machine-output Cases 按 schema/projection、grammar、set predicate、publication、docs
    acceptance 与 direct consumer observable boundaries 划分，不按 public field 建 Case。
12. Current schemas/examples 与 historical `vibe-check.report.v1` materials 分别注册、分别
    traversal；required producer-to-consumer acceptance 到达 actual Product/annotation CLIs。
