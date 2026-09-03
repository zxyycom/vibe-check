# Lizard 1.24.0 current evidence

此目录是 source-aligned analyzer 的**当前连续测试证据**。后续 agent 应从本 README 恢复 owner
层级、identity contract 与更新顺序；具体 Product 行为仍由 `docs/checks/function-metrics.md` 和
`docs/scanner-dependencies.md` 拥有。它只服务于 `src/package-checks/function-metrics/analyzer/**` 的
fidelity、reader 和 adapter 测试；不是 Product 运行时输入，也不随 package payload 发布。

## Owner 边界

- [`licenses/lizard-1.24.0-provenance.json`](../../../../../../../licenses/lizard-1.24.0-provenance.json)
  是唯一 machine-readable upstream source/range、hash、SPDX 与 translated target inventory。所有
  upstream revision、license 和 target-path 判断从那里读取。
- 该 root inventory 完整分类 84 个上游 records：44 个 `translated`、24 个
  `deferred-extension-body` 与 16 个 `excluded-entry-surface`。这些分类是 ledger 事实；本目录只为
  translated closure 提供 current evidence，不能据此把 deferred 或 excluded record 解释为 Product capability。
- 本目录只拥有 current oracle observations、reader mapping、symbol identity 与人读 deviation
  说明。`lizard-1.24-source-identity.json` 只以 `sourcePath`/`sourceRange` 引用根 inventory，
  不复制 hash、SPDX 或 target path；它不是 runtime registry，也不向 Gate 导出 quality selection。
- archive 保存形成时历史，保持只读；当前 `src` 测试和 production 不得将其当作 input 或 current-evidence owner。

## Current materials

| Material                                         | Continuous consumer / purpose                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `lizard-1.24-oracle-observations.json`           | `analyzer-adapter.test.ts` 的 normal/edge source observations。                                                     |
| `lizard-1.24-malformed-reader-observations.json` | `readers/malformed-source.test.ts` 的 27 个 reader-targeted malformed observations。                                |
| `lizard-1.24-reader-extension-mapping.json`      | malformed differential test 的 source-order reader 与 canonical suffix mapping。                                    |
| `lizard-1.24-source-identity.json`               | `source-identity.test.ts` 的 44 translated source/range references、81 class identities、796 symbol/seam mappings。 |
| `source-alignment-deviations.md`                 | 非 direct host seam、source-alignment 边界和 future upstream-sync review 的人读说明。                               |

`source-identity.test.ts` 以 root inventory 为唯一对照，fail-closed 地检查 exact 44 source/range set、39 个
translated targets（包括 extension protocol additional target）、81 个 class identity 与 796 个 symbol/host-seam
mappings。它也扫描 current `src/**/*.ts`，拒绝 archived-Change evidence path。

## Fixed-tag oracle generation

这些 observations 由 detached Lizard `1.24.0` tag `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec` 的实际 CSV
输出生成，而不是由此前 JSON 改写。开发时从仓库根目录对每个 fixture 执行固定 checkout 的
`python lizard.py <fixture> --csv`；Erlang reader 所需的 Pygments 只安装在临时 oracle 环境，不是
Product dependency。`lizard-1.24-oracle-observations.json` 覆盖 55 个 normal suffix fixture 和 27 个
edge fixture（82 个总计），`lizard-1.24-malformed-reader-observations.json` 覆盖按 source-order 的 27
个 malformed fixture；两者都记录 tag、revision、版本输出和每个 fixture 的命令形状。

## Verification

在不需要网络或上游 checkout 的情况下运行：

```bash
bun test src/package-checks/function-metrics/analyzer/source-identity.test.ts
bun test src/package-checks/function-metrics/analyzer/readers/malformed-source.test.ts
bun test src/package-checks/function-metrics/analyzer-adapter.test.ts
```

package artifact verification 另外证明整个 `analyzer/fixtures/lizard-1.24.0/` subtree 不进入候选包。

## Upstream update rule

采用新的 Lizard revision 或改变 translated source boundary 时，先更新 root provenance inventory；再
更新本目录的 observations、identity mappings 与 deviation explanation，并让 current tests 在没有
archive 读取的情况下通过。不得把 archive、临时 clone 或运行时网络访问变成验证前提。
