# Lizard 1.24 source-alignment deviations

本文件解释当前 TypeScript host 为保留 Lizard 1.24 translated scope 所作的窄调整。它是人读
fidelity evidence，而非第二份 provenance ledger：source/range、hash、SPDX、translated target
path 与 upstream revision 的唯一 machine-readable owner 是
[`licenses/lizard-1.24.0-provenance.json`](../../../../../../../licenses/lizard-1.24.0-provenance.json)。

## Closure rule

`lizard-1.24-source-identity.json` 必须恰好引用 root inventory 中 `status: "translated"` 的每个
source/range。`source-identity.test.ts` 以这一个 filtered set 为准，要求：

1. 46 个 translated source/range reference 无缺失、无额外项、无重复项；
2. 每个 reference 至少有一个 AST-verifiable source symbol 或 named host seam；
3. root inventory 推导出的全部 41 个 target 都被验证：每项 primary target 加上
   `additionalTargetPaths`，其中 extension protocol 与 ND typed host 是 additional target；
4. 这些 entries 共同闭合 83 个 class identity 与 820 个 symbol/host-seam mapping；
5. manifest 不得携带 hash、SPDX 或 target-path ledger，并且 current `src/**/*.ts` 不得读取
   archived Change 输入。

因此本文件不重新列出 46 个 range 或 41 个 path；增加、删除或重定向 translated scope 只能先改变
root inventory，并使上述 exact-set check 失败直到 current identity evidence 同步。

## Mapping vocabulary

每一项 non-direct mapping 都在 identity manifest 中有具体 `reason`。以下 vocabulary 说明它们的
稳定边界：

| 映射 | host 调整与边界 |
| --- | --- |
| `python-constructor`          | Python `__init__` 由 TypeScript constructor 表示；不会引入反射或 second lifecycle。                                                       |
| `source-name-host-alias`      | 已存在的 typed host spelling 与 source spelling 共用一个 analyzer-internal storage/callback。                                             |
| `inherited-source-storage`    | Python inherited field 在其定义的 translated parent storage 中验证，不复制派生 class state。                                              |
| `call-signature-host-seam`    | TypeScript 需要区分 token-state call、extension iterable call 或 descriptor invocation；该 seam 保留 source order 和 receiver/lifecycle。 |
| `string-subclass-host-seam`   | Ruby token 的 Python string-subclass state 以唯一 typed object 保留，不形成 generic token framework。                                     |
| `host-casing-seam`            | 仅将不可同时存在的 source snake_case private/function spelling 映射到 host camelCase member，不添加 runtime alias。                       |
| `dynamic-attribute-host-seam` | Python dynamic attribute delegation 改为显式 typed adapter，避免在 Product 中打开任意 attribute surface。                                 |
| `entry-surface-host-seam`     | upstream CLI/parser entry 被 Product 排除，只保留 translated range 内必要的 typed lifecycle hook。                                        |
| `field-initializer-host-seam` | Python initializer 的 state 由 TypeScript declared field initializer 建立；不另建无行为 constructor。                                     |

`direct` 不需要理由：source spelling 直接在 translated target AST 中出现。

## Core and extension boundaries

- `lizard.py` retained analysis lifecycle、models、nesting/builder、five processors、in-memory
  `FileAnalyzer` handoff、`OutputScheme` 与 result-hook ranges 保持 source callbacks、state和顺序。
  File discovery、decode、multiprocessing、report invocation 和 CLI ownership 仍在 port 外。
- `parse_args` 的 translated fragment只保留 `set_args` 的 registration order；Product adapter/Check
  不把 argparse surface带回 analyzer。
- `get_extensions` 是 closed internal registry：known deferred body 仍显式失败，direct internal
  object/class registration 的 ordering 继续由 source-aligned registry/protocol 验证。它不创建 plugin
  API。
- `extension_base` 保留 `ExtensionBase.__call__` 和 inherited context state。protocol 是同一 root
  provenance entry 的 additional target：它承接 TypeScript 特有的 descriptor/special-call resolution，
  同时仍从 `ExtensionBase` 的 source call lifecycle 获得 identity seam。
- `lizardcomplextags` 保留 upstream processor 的 source-order token/current-line append 行为；完整 contributor
  sequence 留在 private port facts，Product 何时投影该事实不属于 translated body。
- `lizardnd` 保留 upstream processor、threshold metadata 和 `check_loop_brackets`。Python import-time
  `patch`/`patch_append_method` 没有被翻译为可变 extension framework：`FileInfoBuilder` 的 17 个 named
  members 与 `FunctionInfo` 的 typed construction/field initialization 是窄的 host seam，并由 identity
  manifest 逐 member AST 验证。它不引入 public loader、reflection 或任意 class patch capability。

## Reader/shared boundaries

35 个 `lizard_languages/**` translated source/range 延续既有逐 symbol identity mapping。1.24 将 Java body states 与 PHP state machine 分别拆到 `java_body_states.py` 和 `php_states.py`；对应的 TypeScript targets 保持在各自 reader-internal module，Java factory 中的嵌套 state classes仍按 source class/member identity 递归验证，避免 ESM 初始化循环而不退回单一大 reader 文件。涉及 inherited
reader state、source aliases、Python constructor、state receiver binding、Ruby token representation及
source regex/whitespace behavior 的差异，均在 manifest 中逐项指向可解析的 translated AST member并给出
reason。它们不扩大为 scanner、filesystem、public parser 或 runtime plugin contract。

## Private façade reader-resolution seam

手写 `analyzer/port-facade.ts` 拥有仅 host 使用的 private reader-resolution seam，供 capability 与
supplied-source analysis 共用。它保持当前 registry selection 与 unsupported-input boundary；未由该 seam
覆盖的输入仍交给 source-aligned registry。该 seam 不是 translated member、public contract、scanner
protocol 或 consumer setting，且不改变 root provenance inventory 或 source-identity mapping。

## Review trigger

当 root provenance 的 translated record、`additionalTargetPaths`、Lizard revision，或任何 source-aligned
member/host seam 改变时，必须复审本文件和 identity manifest。无关 Product adapter、Worker、resource
或 package work 不得借此重排 translated code；反之，不能以 source alignment 为由跳过 lint、format、typecheck、
reader/adapter behavior、license/provenance 或 package-artifact verification。Gate quality exception 的精确硬编码
selection 另由 `scripts/project/gate/definition.ts` 拥有，并由 provenance/header test 验证；本 evidence 不导出该 selection。

仅 private façade reader-resolution seam 改变时，复审本说明和 façade differential evidence 即可；它本身
不要求修改 root provenance 或 identity manifest。
