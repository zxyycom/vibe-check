## 当前事实

| Surface | 当前已实现行为 |
| --- | --- |
| Supported input | `selectLizardTargetFiles` 接受 `.rs` 和以 `.ts` 结尾的 paths；因此 `.d.ts` 属于 TypeScript input。Go、Python、`.tsx`、`.js`、`.jsx` 不进入 selector。 |
| Runtime | Scanner 解析 configured `tools.lizard`，检查 `--version`，用 exact files 加 `--csv` 启动 command，并解析 CSV。 |
| Product model | `FunctionMetric` 暴露 code area、file、name、start/end line、lines、parameter count、changed flag 与 cyclomatic-complexity value/source。 |
| Failure | Eligible dependency unavailable、process failure 或 invalid normalized output 会让整个 `function-metrics` capability 失败；没有 per-file partial contract。 |
| Public identity | Function warnings 和 metric values 使用 `"lizard"` source labels；top-level `config.lizard` 拥有 thresholds。 |
| Config coupling | Complete `QualityConfig.tools` 当前要求 `lizard`、`scc`、`jscpd`。 |

以上事实定义 parity。Upstream Lizard 中未进入当前 selector/model 的 fields、languages 或
tests 只属于迁移参考，不形成新 product obligation。

## Goals / Non-Goals

### Goals

- 从 formal current/baseline scans 删除 Python/Lizard process 与 CSV dependencies。
- 保持当前 TypeScript/Rust inputs、normalized fields、ordering、diagnostics、warnings、
  aggregates、gate、cache/baseline compatibility rules 与 machine projection。
- 每个 translated source 都能追溯到一个 pinned upstream revision、license treatment 与
  owning tests。

### Non-Goals

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

### Decision 5: 保留公开 Lizard-compatible identity

Port 删除不再需要的 `tools.lizard`，但明确保留：

- top-level `config.lizard` threshold names；
- `MetricValue.source = "lizard"` 与 warning `sourceTool = "lizard"`；
- 当前 rule IDs、warning semantics 与 machine field shape。

这些值标识 compatible metric algorithm，而不是 external process。Product tool metadata 与
cache identity 记录 pinned upstream revision 加 TypeScript port revision，使 runtime
provenance 真实，又不强制 machine-contract hard cut。

### Decision 6: 保持 capability-level failure semantics

Internal module 要么为全部 exact supported inputs 返回完整可信 result，要么 adapter 返回
既有 normalized capability failure。File read、decoding、parse、invariant 或 normalization
failure 不得把 partial function set 发布为成功。

Per-file partial continuation 会改变 completeness、warning、output 和 gate trust；只有出现
真实 consumer need 时才进入独立 product change。

### Decision 7: 一次切换并删除退休路径

Parity 通过后，current 与 baseline adapters 同时切换。同一 revision 删除 availability
checks、process invocation、CSV parsing、command/args config、dead tests 和 production
imports。不保留 runtime fallback 或 dual-read path。

## Dependencies and Ordering

1. Product-source promotion 已完成。
2. Machine-output stabilization 应先完成；port 保持其 DTO 与 artifact predicate。
3. External config workflow 应在本 port 后 rebase，使 generated/dogfood complete configs
   不含 `tools.lizard`。
4. 如果本 port 被取消，external config task 0.4 记录该结果并改为 current Python/Lizard
   config shape。

## Verification Strategy

- Pinned source archive/revision/license 与 verified two-language source/test map。
- 当前 adapter 的 `.ts`、`.d.ts`、`.rs` baseline，包含 zero functions 和 failures。
- 每项 translated source responsibility 的 unit tests。
- Differential inventory 与 normalized field/order comparison。
- 既有 scanner、completeness、warning、aggregate、gate、human、machine、cache 与
  baseline regression tests。
- Formal-entry evidence：eligible scans 不解析或启动 Python/Lizard。
- Config parser/default/fixture tests：hard cut 后拒绝 `tools.lizard`，但保留
  `config.lizard` thresholds。
- Static search：production process/CSV/config path 已删除。

## Deferred Triggers

- 只有 scan-scope 与 structural-scanning owners 定义新的 supported input 和 proof targets
  时，才增加其它语言。
- 只有通过独立 completeness/diagnostic/output change，才增加 per-file partial results。
- 只有第二个真实 implementation 必须履行同一 consumer contract 时，才增加 generic
  scanner/provider boundary。

## Open Questions

Product-contract 层没有未决问题。Exact source closure 与 test mapping 是 tasks 1.2-1.4 的
required baseline evidence，不允许借此扩大语言或 public fields。
