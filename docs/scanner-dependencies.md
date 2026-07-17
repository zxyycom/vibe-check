# Scanner 依赖选择

本文是 Vibe Check scanner 依赖选择的 owner 文档。它维护默认 scanner stack、component
配置归属、adapter 边界、替换条件和验收要求。

本文只回答“产品调用哪些外部 scanner，以及如何隔离 process / report protocol”。指标、
warning、baseline、gate、artifact shape 和输出字段仍由各自 owner 定义。

## 实施状态

`src/product/**` 下的仓库自有 TypeScript/Bun source 调用 scc、Python/Lizard 和 jscpd。
`src/product/config.ts` 是 scanner commands、args、thresholds 和 code-area mappings 的
唯一产品配置 owner；quality-core 和运行时实际可达的 foundation helper 闭包都由
`src/product/**` 直接拥有。Quality-core gitlink 和 Rust scanner runtime 已移除。

## 默认 scanner stack

| Component | Product responsibility | Adapter-private material |
| --- | --- | --- |
| scc | file-level code/comment/blank lines、language 与 decision-token input | process protocol、by-file CSV、native errors |
| Python/Lizard | function name、range、NLOC、parameter count 与 cyclomatic complexity | Python invocation、Lizard CSV、component-private fields |
| jscpd | per-code-area duplicate fragments、locations 与 token count | temporary config、CLI protocol、JSON reporter output |

Product config 提供每个 component 的 command 和 args。调用者可以使用既有环境变量覆盖
command / args；wrapper 不得新增第二套 dependency configuration。

Scanner tools 是外部 components，不是 product public API。Product Core、Output 和
consumer 只依赖 Vibe Check-owned metrics、warnings、fatal issue/status context 和
normalized failure。

## 共同 adapter contract

每个 adapter 必须：

1. 只接收 product core 已批准的 exact scan inputs。
2. 检查并报告工具可用性；preflight unavailable 按现有 behavior 记录并跳过 component。
3. 隔离 command line、process result、timeout、native error 和 raw report。
4. 解析后返回 Vibe Check-owned model 或 normalized failure。
5. 在需要复现 scanner behavior 时把 raw output 写为 scanner artifact，而不是 stable
   output field。

External tool 的 stdout/stderr、CSV/JSON row、language enum、临时路径和 private config
不得直接成为 product contract。无发现、profile skip、availability preflight skip、
non-zero exit、missing report 和 parse failure 必须保持可区分。

## scc boundary

scc adapter 使用现有 product config 的 command / args 和 by-file output，向 product core
返回 Vibe Check-owned `FileMetric` records。Adapter 拥有 CSV header mapping、language
normalization、decision-token extraction 和 process failure。

以下内容保持 pinned TypeScript source 行为：

- exact scan file list 与 code-area classification。
- file code/comment/blank lines 与 language mapping。
- availability preflight skip，以及 invocation 后 unknown header、invalid row 和 non-zero
  execution 的 failure projection。
- raw output、tool metadata、cache identity 和 aggregation input。

当前产品不使用已退役 Rust LOC adapter 或 model。

## Python/Lizard boundary

Function metrics component 使用 product config 解析的 Python command 与 `-m lizard` args。
Adapter 只接收 normalized scan scope 中的 `.ts` / `.d.ts` 和 `.rs` exact paths；`.go`、
`.py`、`.tsx`、`.js` 和 `.jsx` 不在 pinned TypeScript selector 中。Adapter 不得接收
project root 重新发现输入。

Lizard CSV parser 负责把 row 归一化为 Vibe Check-owned `FunctionMetric`：stable name、
file、start/end line、NLOC、parameter count 和 cyclomatic complexity。Python process
protocol、CSV output 和 component-private data 留在 adapter 内。

Current raw artifact 保存 normalized function metrics；process / CSV material 即使为复现而
保存也只属于 scanner artifact，不是 stable product output field。Invocation 后的 non-zero
exit 和 parse failure 返回现有 normalized failure，不降级为 zero functions。

当前产品不使用已退役 Rust structural API 或 grammar characterization，也不把 Lizard
重写为 TypeScript。Function inventory、parser 和 warning 算法由当前 TypeScript 产品
实现与测试拥有。

## jscpd boundary

jscpd adapter 使用 existing product config 的 repository-managed CLI command。Product core
按 configured code area、format 和 minimum-token values 规划 tasks；adapter 只接收每个
task 的 exact paths。

Adapter 可以为这组 exact paths 创建临时 config 和 reporter directory，并调用 jscpd JSON
reporter。它把 reporter output 归一化为 Vibe Check-owned `DuplicateCodeFragment`：
locations、token/line count、code areas、changed-scope marker 和 stable ordering。

Temporary config、reporter result structure、process protocol 和 private options 留在 adapter
内。Raw JSON 可以作为 scanner artifact 保存，但不成为 stable product output field。
Successful process without report、invalid report 和 non-zero execution 使用现有 distinct
failure reason，不能投影为 successful empty duplicates。Availability preflight unavailable
保持现有 skipped behavior。

当前产品不使用已退役 Rust duplicate API；原 dependency characterization 与 fixtures
不是 TypeScript tests 的证明来源。

## Runtime dependency closure

`src/product/**` 拥有运行 scanner 所需的 TypeScript core、entry code 和实际可达
foundation helpers。正式产品入口追踪到的 runtime import 不得进入 `scripts/**` 或
toolkit gitlink。

只复制产品路径静态可达的 foundation closure。仍服务开发脚本的 foundation /
parallel-task-runner 可以留作开发依赖，但不因此成为 product runtime dependency。来源
commits 和复制范围记录在 `src/product/README.md`。

产品依赖闭包保持现有 file grouping 和 control flow；不得为这些 adapters 抽出新的通用
scanner framework、service layer 或 provider hierarchy。

## Failure and observability

Adapter failure 必须保留 tool、phase 和可行动 error。Product runtime 可以保存 raw scanner
material、tool version 和 command metadata 以复现问题，但 Output 只消费 normalized product
data。

以下情况不得等价处理：

- zero supported inputs。
- quick profile 跳过 jscpd。
- scanner 正常完成但没有 findings。
- availability preflight skip。
- process、report 或 parser failure。
- normalized output validation failure。

Scanner dependency 变更不得自行重新设计 fatal issue、console channel、artifact
directory、status 或 exit code。

## 替换流程

满足任一条件时，可以在独立 change 中替换或升级 dependency：

1. Component 无法在目标平台或发布链路可靠运行。
2. 许可证、安装、native dependency、性能或安全风险不可接受。
3. CLI / output 在兼容版本内频繁破坏，导致 adapter 维护成本过高。
4. Checked-in tests 证明 path、metric、location 或 duplicate semantics 不满足 product
   contract。
5. 出现更小、更稳定且能保持 Vibe Check-owned model 的替代 component。

替换前必须记录当前 baseline、候选方案、配置和 artifact 兼容性；更新本文、adapter tests
和受影响 owner 后再修改实现。

## 验证要求

当前 scanner stack 的最低证明包括：

- scc by-file CSV parser 与 failure mapping。
- Lizard CSV function fields、process failure 和 supported exact inputs。
- jscpd version/report parser、真实 duplicate scan、unavailable / execution / report / parse
  failures。
- jscpd per-area task planning、file ordering 和 fatal issue channel。
- raw scanner artifacts 不进入 stable product models。
- product runtime import closure 不依赖 `scripts/**` 或 toolkit gitlink。
- 正式入口与 dogfood wrapper 到达同一 product core。

初次产品化的 quick、full、baseline 和 explicit changed-files parity 已作为一次性迁移证据
完成。Dependency 或 parser 的新增 characterization、覆盖补齐和 scanner 改写进入后续
独立 change。
