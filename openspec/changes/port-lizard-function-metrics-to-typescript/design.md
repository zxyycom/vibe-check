## 当前事实与实施入口

| Surface | 本文记录时已实现行为 | Port 开始前必须成立的前置状态 |
| --- | --- | --- |
| Supported input | `selectLizardTargetFiles` 接受 `.rs` 和以 `.ts` 结尾的 paths；因此 `.d.ts` 属于 TypeScript input。Go、Python、`.tsx`、`.js`、`.jsx` 不进入 selector。 | 保持不变。 |
| Runtime | Scanner 检查 Python/Lizard availability，用 exact files 加 `--csv` 启动 process，并解析 CSV。 | Execution settings 已由 internal dependency snapshot 拥有，不来自 project config。 |
| Product model | `FunctionMetric` 暴露 code area、file、name、start/end line、lines、parameter count、changed flag 与 cyclomatic-complexity value/source。 | 保持不变。 |
| Failure | Eligible dependency unavailable、process failure 或 invalid normalized output 会让整个 `function-metrics` capability 失败；没有 per-file partial contract。 | 保持 normalized capability semantics。 |
| Public identity | Function warnings 和 metric values 使用 `"lizard"` source labels。 | Semantic project config 使用 `checks.functions` / `checkId`；现有 machine source labels 保持兼容。 |
| Config coupling | 本文记录时的 `QualityConfig` 仍含 tool-named fields。 | `decouple-project-config-from-scanner-tools` 已完成 hard cut；该迁移不由本 port 实施。 |

第一列当前事实定义 pre-switch parity，不授权在本 change 中保留 public tool coupling。第三列是
implementation gate：task 0.3 未关闭前，不得从 section 1 开始。

Upstream Lizard 中未进入当前 selector/model 的 fields、languages 或 tests 只属于迁移参考，
不形成新 product obligation。

## Goals / Non-Goals

### Goals

- 从 formal current/baseline scans 删除 Python/Lizard process 与 CSV dependencies。
- 保持当前 TypeScript/Rust inputs、normalized fields、ordering、diagnostics、warnings、
  aggregates、gate、cache/baseline compatibility rules 与 machine projection。
- 每个 translated source 都能追溯到一个 pinned upstream revision、license treatment 与
  owning tests。
- 证明 backend replacement 不改变 semantic config contract 或 external config workflow。

### Non-Goals

- Project config field、schema、version、starter、discovery、initializer 或迁移机制。
- Go、Python、JavaScript/JSX/TSX 或其它当前未选择语言。
- Token count、function kind、long name、raw parser nodes 或其它新 product fields。
- Per-file warning/partial-report semantics，或 parser failure 后 best-effort continuation。
- Generic scanner framework、provider selection、plugin API、npm package 或 public analyze
  API。
- Parity 期间顺带清理算法、改进 parser 或修复已知 Lizard behavior。

## Decisions

### Decision 1: 只移植 verified current source closure

最终 translated file list 由 pinned Lizard 1.23.0 中 TypeScript/Rust readers 所需的
import/call closure 决定。下表只是 investigation candidate map，不证明每一行都必需：

| Role | Candidate upstream source | Inclusion rule |
| --- | --- | --- |
| Analysis model/pipeline | `lizard.py` | 只纳入 product-reachable model、builder 与 analysis behavior。 |
| Reader/token base | `lizard_languages/code_reader.py` | 只纳入 current readers 可达 tokenizer/state behavior。 |
| C-like support | `lizard_languages/clike.py` | 纳入 TypeScript/Rust 共享且可达的 behavior。 |
| Script/regex support | `script_language.py`、`js_style_regex_expression.py` | 只有 pinned closure 证明 current TypeScript 可达时才纳入。 |
| TypeScript reader | `lizard_languages/typescript.py` | 纳入 current `.ts` / `.d.ts` behavior。 |
| Rust reader | `lizard_languages/rust.py` | 纳入 current `.rs` behavior。 |
| Registry | `lizard_languages/__init__.py` | 只替换 current two-reader registration responsibility。 |

`go.py`、`python.py`、`golike.py`、unused readers、CLI、reporter、extensions 和 duplicate
detector 均不在范围内，除非 source-closure audit 证明某 shared file 是技术必需依赖。新增
product language 需要独立 contract change。

### Decision 2: 使用一个具体 internal dependency boundary

Repository-owned module 暴露一个 internal typed analyze entry，输入 source/file 与 selected
language。既有 function-metrics adapter 继续作为 consumer boundary，拥有 exact file
input、UTF-8/file reads、path normalization、`FunctionMetric` mapping、capability failure 与
raw reproduction artifacts。

不增加 provider interface 或 implementation registry。只有出现第二个真实
implementation/selection obligation 时才重新评估。

### Decision 3: 先对照翻译，再做 TypeScript cleanup

Translation 初期尽量保持 upstream state names、token order、control flow 和 algorithmic
behavior。Python generator、collection 与 regular expression 只做等价 TypeScript execution
所需 adaptation。Source comments 标明 non-obvious adaptation 与 pinned revision。

Differential parity 建立前不合并文件、不新增抽象、不重构算法；后续动作需要独立证据。

### Decision 4: Product parity 只覆盖当前 product contract

Differential comparison 只在迁移期把 pinned Python/Lizard 当 oracle。对于 `.ts`、`.d.ts`、
`.rs` corpus，它必须证明 function inventory 和全部 current normalized fields/order。
Translated unit tests 可以证明信任 port 所需的 internal tokenizer/state invariants，但这些
internals 不进入 product fields。

存在未解释差异时不得切换。切换后的 required validation 只使用 checked-in source 与
expected results，不依赖 Python。

### Decision 5: Backend replacement 不迁移 public config 或 output identity

Port 前置 change 已让 project config 使用 semantic `checks.functions` 与 stable `checkId`，
dependency execution settings 只存在于 internal snapshot。因此本 change：

- 保持 semantic config field tree、version、runtime/generated schema、starter 与 examples；
- 保持 `MetricValue.source = "lizard"` 与 warning `sourceTool = "lizard"`、当前 rule IDs、warning
  semantics 和 machine field shape；
- 只从 internal dependency resolver/snapshot 删除 Python/Lizard command、args、availability 与
  process protocol。

Machine labels 标识 compatible metric algorithm，不是 project-level backend selection。
Product tool metadata 与 cache identity 记录 pinned upstream revision 加 TypeScript port
revision，使 runtime provenance 真实，又不强制 machine-contract hard cut。

### Decision 6: 保持 capability-level failure semantics

Internal module 要么为全部 exact supported inputs 返回完整可信 result，要么 adapter 返回
既有 normalized capability failure。File read、decoding、parse、invariant 或 normalization
failure 不得把 partial function set 发布为成功。

Per-file partial continuation 会改变 completeness、warning、output 和 gate trust；只有出现
真实 consumer need 时才进入独立 product change。

### Decision 7: 一次切换并删除退休路径

Parity 通过后，current 与 baseline adapters 同时切换。同一 revision 删除 internal
Python/Lizard resolution、availability checks、process invocation、CSV parsing、dead tests 和
production imports。不保留 runtime fallback 或 dual backend path。

### Decision 8: 作为最终运行时统一提升项延期

本 port 的工程收益、实现风险和验证成本都高，但它保持现有 function-metrics 产品契约，
用户直接感知有限。它当前排在 semantic config 与 external config workflow 等产品向工作之后，
不是默认近期任务。活动状态、规划完整或 dependency 实现仍存在都不能单独构成优先实施理由。

前置 semantic config 先消除 public backend coupling，external workflow 直接发布最终 semantic
schema；本 port 恢复时不再产生 config migration。只有用户显式重新排序，或出现直接阻塞
产品交付、目标平台可用性、可靠性、安全或许可证合规的证据时，才提前重新评估。

## Dependencies and Ordering

1. Product-source promotion 与 machine-output stabilization 已完成。
2. `decouple-project-config-from-scanner-tools` 必须先实现并验证 semantic config、internal
   dependency snapshot 与 compatibility boundary。
3. 按当前产品优先级，`add-external-project-config-workflow` 先交付；若用户显式重新排序或出现
   Decision 8 的直接阻塞证据，必须先记录新的排序依据。
4. 本 port 开始时只 rebase internal dependency/runtime facts，不修改已经发布的 semantic
   config contract。

## Verification Strategy

- Pinned source archive/revision/license 与 verified two-language source/test map。
- 当前 adapter 的 `.ts`、`.d.ts`、`.rs` baseline，包含 zero functions 和 failures。
- 每项 translated source responsibility 的 unit tests。
- Differential inventory 与 normalized field/order comparison。
- 既有 scanner、completeness、warning、aggregate、gate、human、machine、cache 与
  baseline regression tests。
- Formal-entry evidence：eligible scans 不解析或启动 Python/Lizard。
- Config-stability evidence：semantic runtime/generated schema、starter、fixture 与 public
  authoring contract 不因 backend replacement 变化。
- Static search：production Python/Lizard process、CSV 与 internal dependency settings 已删除。

## Deferred Triggers

- 只有 scan-scope 与 structural-scanning owners 定义新的 supported input 和 proof targets
  时，才增加其它语言。
- 只有通过独立 completeness/diagnostic/output change，才增加 per-file partial results。
- 只有第二个真实 implementation 必须履行同一 consumer contract 时，才增加 generic
  scanner/provider boundary。

## Remaining baseline evidence

Product-contract 层没有未决问题。Exact source closure 与 test mapping 是 tasks 1.2-1.4 的
required baseline evidence，不允许借此扩大语言或 public fields。
