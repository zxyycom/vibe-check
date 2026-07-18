# 测试策略

本文定义 Vibe Check 自动化测试的层级、所有权、fixture 边界、统一验证入口和一致性审计
规则。以下子文档维护测试用例流程和最终账本：

- [测试用例维护](testing/case-maintenance.md)：测试函数、fixture 证明目标和源码
  `@case` 标记变更时的维护流程。
- [测试用例编号账本](testing/cases.md)：最终 case 条目、证明目标和源码 `@case` 标记
  映射。

稳定 CLI、scan scope、metrics、warning、baseline、artifact 和 output 语义以
[文档导航](navigation.md#规则所有权) 指向的 owner 文档为准。测试文档只记录证明目标、
测试归属和验收边界。

## 实施状态

产品测试 owner 位于 `src/product/**`，测试对象是仓库自有 TypeScript/Bun source、正式
product entry 和外部 scanner adapters。迁移后的 quality-core tests / fixtures 位于
`src/product/quality-core/**`；`docs/testing/cases.md` 记录其当前路径。

Rust tests / fixtures 已随 Rust 产品删除，不迁移、复制、改写或逐项映射到 TypeScript
产品。新增 coverage、scanner characterization 或既有缺陷修复进入独立 change，不回填
已删除的 Rust 证明资产。

## 测试层级

| 层级 | 核心目标 |
| --- | --- |
| 文档 / schema | Markdown 链接、JSON 语法和 checked-in schema/examples 一致性；已退役历史材料不重新定义当前产品语义 |
| Product unit | TypeScript model、file collection、scanner parser/wrapper、aggregation、baseline/cache、warning 和 report helper 的自定义不变量 |
| Product entry | 通过正式 `product:cli` 与 dogfood wrapper 验证 project root、flags、console、status 和 artifacts 到达同一 core |
| Script consumer | CI annotation、workspace verifier 和其它 `scripts/**` consumer 只消费产品 output，不成为第二套产品实现 |
| Productization parity | 一次性证明上移前 pinned consumer 与当前产品入口在 quick、full、baseline 和 explicit changed-files 下等价 |
| 综合验证 | docs、OpenSpec、TypeScript product/tooling、quality dogfood 和 workspace gates 证明交付边界没有漂移 |

当前 workspace verifier 使用 TypeScript product checks，不保留空跑或不可达的 Rust /
Cargo 产品 gate。

## 测试所有权

测试按“用户可观察 contract”和“自定义逻辑不变量”划分。一个行为只有在证明不同责任时
才跨层测试：

- Product unit tests 证明 normalized model、parser、ordering、cache identity 和 warning
  algorithm。
- Product entry tests 证明正式命令与 dogfood wrapper 的外部行为。
- Productization parity 已一次性证明源码位置和入口改变没有修改 TypeScript behavior。
- Workspace validation 证明 consumer、docs 和 automation 接线仍可工作。

历史回归只作为风险线索，不自动成为新 proof target。新增断言前必须能写出“owner 承诺的
语义 -> 可观察结果”，并追溯到当前 owner、现有 TypeScript behavior 或明确 change
requirement。

已有缺陷或 coverage 缺口进入后续 change，不借 owner 搬移改变既有测试范围或预期结果。

## Product unit tests

当前 TypeScript tests 继续证明其职责。`docs/testing/cases.md` 记录的直接
资产包括：

- `measurement/scanners.test.ts`：scc by-file CSV、Lizard CSV、jscpd version/report parser，
  以及 jscpd unavailable / execution / report / parse failure。
- `measurement/scanners/jscpd/area-scans.test.ts`：per-code-area task planning、稳定 task /
  file ordering 和 current-scan fatal issue channel。
- `measurement/cache.test.ts`：duplicate 与 baseline cache identity、cache hit 和 snapshot
  integrity。
- `input/files.test.ts`：file fingerprint、Git pathspec、explicit changed-files
  路径/错误边界，以及 current/baseline Git collection 与 config-only fallback。
- `output/warnings/generator.test.ts`：file/function/duplicate thresholds、changed/regression
  channels 和 accepted warning behavior。
- `output/report/markdown-report.test.ts`：ranking、changed-file summary、metric labels 和
  accepted reason。

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
- `scripts/quality/scan.ts` 与 `quality:check`、`quality:full-check`、`quality:scan` 只作为
  单向 wrapper，并显式传入 Vibe Check repository root。
- 正式入口与 wrapper 保持现有 flags、profile、console、artifact 和 status mapping。
- Product runtime import closure 不反向导入 `scripts/**` 或 toolkit gitlink。

入口 tests 不需要为每个 flag 复制完整 scanner matrix；选择能证明 routing、root 和 output
边界的代表性路径。

## 脚本与工具依赖

验证脚本和按需工具的安装方式由 [脚本工具](script-tooling.md) 拥有。本节只定义测试
边界：

- `bun run typecheck:scripts` 和 `bun run lint:scripts` 继续验证尚留在 `scripts/**` 的
  consumers / wrappers，不代替 product typecheck、lint 和 test。
- `quality:check` / `quality:full-check` / `quality:scan` 调用
  `src/product/**` 的同一 core。
- Foundation 只复制 product runtime 实际可达的 helper；仍在 submodule 中的开发 helper
  tests 不因此成为 product tests。
- 新 checkout、Bun、pnpm 和 external scanner installation requirements 由 script tooling
  owner 维护。

## 统一验证入口

文档先行阶段至少运行：

```bash
bun run validate:docs
bun run validate
```

TypeScript 产品交付验证按改动面覆盖：

- product import boundary。
- product typecheck、lint 和 tests。
- `bun run quality:check`。
- `bun run quality:full-check`。
- `bun run quality:scan`。
- `bun run verify:vibe-check-workspace:full`。

局部改动可以先运行更窄的 tests，但跨源码所有权、产品入口、scanner adapters 和
artifacts 的交付必须运行相应 product tests、dogfood 和 workspace verification。一次性
productization parity 已完成，不属于日常统一验证入口。无法运行的验证要记录具体命令、
原因和残余风险。

## 一致性审计

交付前检查：

1. 新增、删除或移动的 tests 能追溯到 owner 文档或明确 change requirement。
2. 已迁移 TypeScript tests / fixtures 的证明目标和 case 映射保持可追溯。
3. 已删除的 Rust tests / fixtures 没有进入 `src/product/**`。
4. 测试文档不重新定义 threshold、warning、baseline、artifact 或 status。
5. Case ledger 路径和 `implemented` 状态必须对应实际测试与唯一 `@case` marker。
6. Scanner raw fixture 只证明 adapter protocol，不成为 stable output model。
7. 发现既有缺陷或 coverage gap 时进入后续 change。
