# 测试策略

本文定义 Vibe Check 自动化测试的层级、所有权、fixture 边界、统一验证入口和一致性审计
规则。测试证据由以下项目材料维护：

- [测试证据维护](testing/case-maintenance.md)：原生测试节点、fixture 证明目标、case
  identity 和统一目录的维护流程。
- `docs/test-evidence/`：受控 topic、每个原生测试节点一个 case 的 source files，以及
  由统一 CLI 生成的派生索引。

稳定 CLI、scan scope、metrics、warning、baseline、gate、process outcome、artifact 和
output 语义以
[文档导航](navigation.md#规则所有权) 指向的 owner 文档为准。测试文档只记录证明目标、
测试归属和验收边界。

## 实施状态

产品测试 owner 位于 `src/product/**`，测试对象是仓库自有 TypeScript/Bun source、正式
product entry 和外部 scanner adapters。迁移后的 quality-core tests / fixtures 位于
`src/product/quality-core/**`；可由正式入口扫描的 reusable external project fixture 位于
`fixtures/projects/**`。`docs/test-evidence/**` 把当前原生 test 节点映射到证明目标。

Rust tests / fixtures 已随 Rust 产品删除，不迁移、复制、改写或逐项映射到 TypeScript
产品。新增 coverage、scanner characterization 或既有缺陷修复进入独立 change，不回填
已删除的 Rust 证明资产。

## 测试层级

| 层级 | 核心目标 |
| --- | --- |
| 文档 / schema | Markdown 链接、JSON 语法和 checked-in schema/examples 一致性；已退役历史材料不重新定义当前产品语义 |
| Product unit | TypeScript model、completeness/gate reducer、file collection、scanner parser/wrapper、aggregation、baseline/cache、warning 和 output helper 的自定义不变量 |
| Product entry | 通过正式 `product:cli` 与 dogfood wrapper 验证 project root、flags、scan plan、console、process outcome、completeness、gate 和 artifacts 到达同一 core |
| Script consumer | Quality dogfood、CI annotation、workspace verifier 和其它 `scripts/**` consumer 只透传或消费产品 behavior，不成为第二套产品实现 |
| Productization parity | 一次性证明上移前 pinned consumer 与当前产品入口在 quick、full、baseline 和 explicit changed-files 下等价 |
| 综合验证 | docs、OpenSpec、TypeScript product/tooling、quality dogfood 和 workspace gates 证明交付边界没有漂移 |

当前 workspace verifier 使用 TypeScript product checks，不保留空跑或不可达的 Rust /
Cargo 产品 gate。

## 测试所有权

测试按“用户可观察 contract”和“自定义逻辑不变量”划分。一个行为只有在证明不同责任时
才跨层测试：

- Product unit tests 证明 normalized model、parser、ordering、cache identity、warning
  algorithm、GateResult evaluation 和 output projection。
- Product entry tests 证明正式命令、显式完整 config、gate process outcome 与 dogfood
  wrapper 的外部行为。
- Productization parity 已一次性证明源码位置和入口改变没有修改 TypeScript behavior。
- Workspace validation 证明 consumer、docs 和 automation 接线仍可工作。

历史回归只作为风险线索，不自动成为新 proof target。新增断言前必须能写出“owner 承诺的
语义 -> 可观察结果”，并追溯到当前 owner、现有 TypeScript behavior 或明确 change
requirement。

已有缺陷或 coverage 缺口进入后续 change，不借 owner 搬移改变既有测试范围或预期结果。

## Product unit tests

当前 TypeScript tests 继续证明其职责。`docs/test-evidence/**` 记录的直接资产包括：

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
- `config-file.test.ts` 与 `args.test.ts`：完整 JSON config parsing、option presence 与 gate
  parser/help/scan-plan normalization。

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
- cache/fingerprint、changed-files 和 report/warning behavior。

Rust CLI project fixtures 和 Rust dependency / grammar characterization fixtures 已删除。
它们不是 TypeScript behavior source，也不得被复制到 `src/product/**` 作为“补齐”。若
现有 TypeScript test 无法证明某个长期 contract，先把缺口记录为后续 change。

可由正式入口扫描的 external project fixture 与 unit/scanner protocol support 分开：
`fixtures/projects/configured-typescript/` 提供完整 config、eligible / excluded /
generated source 和受控 scanner command。`src/product/configured-project.test.ts` 从
fixture root 外调用正式入口，证明 selected config、路径、整体替换、CLI precedence、
scope、code area、warning、artifact、complete / empty / failed conclusion 与退出状态；
受控 scanner 只提供 deterministic acceptance support，不定义稳定 Core / Output
contract。

Gate acceptance 复用同一 checked-in fixture，不新增平行 project fixture：
`src/product/cli-omitted-gate-baseline.test.ts` 固定 omitted request 的既有行为；
`src/product/cli-gate-acceptance.test.ts` 在临时 copy 中建立受控 Git comparison，证明
quick `all`、all-only warning、input-unchanged、changed non-regression、regression 和
comparison unavailable。Accepted/mixed warning、empty/incomplete 与 output failure 的
owner 不变量由 evaluator/engine tests 证明，formal entry 不复制同一组合矩阵。

## 一次性 productization parity evidence

初次产品化验收使用迁移后的现有 TypeScript fixture material 建立隔离 Git project，固定：

- baseline commit。
- current commit。
- explicit changed-files input。
- scanner tools 和 product config。

上移前 pinned consumer 与当前 product entry 扫描同一个 fixture project。Quick、full、
with-baseline 和 explicit changed-files runs 已比较：

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
- 省略 project root 时使用启动 cwd。
- `scripts/quality/scan.ts` 与 `quality:check`、`quality:full-check`、`quality:scan`、
  `quality:gate` 只作为单向 wrapper，并显式传入 Vibe Check repository root；前三个
  package invocations 保持 omitted gate，`quality:gate` 固定 full `regressions` request。
- 正式入口与 wrapper 保持 product-owned flags、profile、gate、console、artifact 和 process
  status mapping。
- 显式 config acceptance 使用 checked-in external project，证明相对 path、整体替换、
  selected scope、warning、artifact 与 config error exit `3`。
- Formal entry 对代表性的 complete、legitimate empty 与 required component unavailable
  scan，证明 core outcome、console conclusion、`metrics.json`、`report.md` 和 CLI exit
  投影同一 completeness source。
- Formal gate entry 对 disabled、evaluated passed/failed 与 comparison not-evaluated
  representative branches，证明 GateResult、warning streams、report/console 和 exit
  `0` / `1` / `2` 使用同一 evidence；usage conflicts 独立证明 exit `3` 且不启动 scanner
  或 artifacts。
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
  full `regressions`；它们均调用 `src/product/**` 的同一 core。
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
- `bun run quality:check`。
- `bun run quality:full-check`。
- `bun run quality:gate`。
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
5. 每个进入验证范围的原生 test 节点对应一个且仅一个当前 case；Entry、case ID 和
   source path 无重复，派生索引保持同步。
6. Completeness tests 分层证明 model/reducer、adapter result 和 formal-entry
   cross-surface mapping，不靠重复同一 scanner matrix 获得覆盖数量。
7. Scanner raw fixture 只证明 adapter protocol，不成为 stable output model。
8. External project fixture 位于 `fixtures/projects/**`，不与 product unit fixture 混合。
9. Gate proof targets 按 descriptor/evaluator、CLI planning/usage、core/output 和 formal-entry
   层级分配，不按 policy/status 做笛卡尔复制。
10. 发现既有缺陷或 coverage gap 时进入后续 change。
