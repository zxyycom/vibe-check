# Gate readiness handoff

本 handoff 是 `build-candidate-backed-project-gate` 的当前 cutover 证据输入。稳定行为由
[`docs/script-tooling.md`](../../docs/script-tooling.md#候选-project-gate) 拥有；本文件只记录本次
候选包标识、内容清单与执行证据。它不改变正式入口：legacy workspace verifier 仍是当前
正式门禁。cutover 必须在获授权后，按本文的重新验证条件使用这些证据。

## 记录时的工作树边界

- 记录时的 `HEAD`：`f3204cce8e618e707312a6cb29e2d1285862491c`。
- Gate 实现及其稳定脚本/测试 owner 内容当时均未提交；本轮最终顺序验收期间，所有 tracked inputs
  均未编辑。
- `scripts/project-gate/**` 拥有 catalog 与 adapter；`scripts/quality/project-gate/**` 通过 private consumer
  中安装的 public `vibe-check` 创建 Definition 与 bound Run。

## 候选包标识

| 字段 | 记录值 |
| --- | --- |
| candidate version | `0.0.0-local.14c849cd8f47` |
| exact tarball | `/workspace/vibe-check/.cache/vibe-check/package-candidate/artifacts/vibe-check-0.0.0-local.14c849cd8f47.tgz` |
| tarball SHA-256 | `2be56847f0eed153c5a63723fd48c6d7bb19fb38ddd42f61fab2dec55dc9b46b` |
| candidate input fingerprint | `14c849cd8f47f68c94e0db389fc8937e3b7d3fe59c5aee8732c6c04f01d96cc1` |
| installed/resolved entry | `/workspace/vibe-check/scripts/quality/node_modules/vibe-check/index.mjs` |
| runtime | Bun `1.3.14`, `linux-x64` |
| preparation observation | 已复用匹配当前输入的 receipt；这不是 fresh rebuild observation |

物理 lifecycle candidate test 与使用该 tarball 的 isolated external consumer 均已通过。adapter 在动态导入
Gate 前准备候选包，并在创建 invocation log 或运行 bound Run 前比较 prepared resolved entry 与 private-consumer
entry。

## 内容清单

清单覆盖 `scripts/project-gate/` 和 `scripts/quality/project-gate/` 下的全部 regular files，以及
`docs/script-tooling.md`、`docs/testing/cases/repository-tooling.md`、`scripts/tools/foundation/src/process/types.ts`、
`scripts/tools/foundation/src/process/runner.ts` 与 `scripts/tools/foundation/test/foundation.test.ts`。它不声称覆盖
foundation 的完整依赖闭包。

- algorithm：按 byte order 排序 UTF-8 POSIX-relative paths；每个文件依次追加 `relative-path` 的 UTF-8 bytes、
  一个 NUL、raw content bytes 与一个 NUL，再对结果计算 SHA-256。
- file count： `15`
- manifest SHA-256： `afe712b92e78b88757ab3137b89adea49cd460826adb37a937c48620497fa46a`

该清单标识工作树内容，不标识 committed tree。不同 digest 要求在 cutover 前刷新 manifest 并重跑 Gate
acceptance；manifest 自身变化不等同于 candidate package inputs 变化，也不单独要求 fresh rebuild。

## Profile acceptance evidence

候选 catalog 是下列 20 项映射的来源。`N/A(profile)` 表示 descriptor 不属于该 profile。所有
required/full 行均未使用 disabled tags。

| Candidate Check ID | Legacy category / command boundary | required | full | tags |
| --- | --- | --- | --- | --- |
| `typecheck-product` | Product static typecheck | passed | passed | `product` |
| `lint-product` | Product static lint | passed | passed | `product` |
| `typecheck-scripts` | Scripts static typecheck | passed | passed | `scripts` |
| `lint-scripts` | Scripts static lint | passed | passed | `scripts` |
| `format-check` | Repository format check | passed | passed | `format` |
| `quality-quick-check` | Repository quality quick dogfood | passed | N/A(profile) | `quality` |
| `docs-json-validator` | Docs JSON validation | passed | passed | `docs` |
| `docs-schema-validator` | Docs schema validation | passed | passed | `docs` |
| `docs-example-validator` | Docs example validation | passed | passed | `docs` |
| `docs-links-validator` | Docs link validation | passed | passed | `docs` |
| `decision-records` | Decision-record catalog check | passed | passed | `catalog` |
| `test-evidence` | Test Evidence catalog check | passed | passed | `catalog`, `tests` |
| `test-evidence-rule-tests` | Test Evidence rule tests | passed | passed | `catalog`, `tests` |
| `git-diff-whitespace` | Git whitespace check | passed | passed | `git` |
| `product-tests` | Product tests | N/A(profile) | passed | `product`, `tests` |
| `toolkit-foundation-typecheck` | Foundation package typecheck | N/A(profile) | passed | `foundation` |
| `toolkit-foundation-lint` | Foundation package lint | N/A(profile) | passed | `foundation` |
| `toolkit-foundation-format-check` | Foundation package format check | N/A(profile) | passed | `foundation`, `format` |
| `toolkit-foundation-tests` | Foundation package tests | N/A(profile) | passed | `foundation`, `tests` |
| `quality-full-check` | Repository quality full dogfood | N/A(profile) | passed | `quality` |

Candidate preparation 是 adapter bootstrap，不计入 catalog。catalog 因此为 20 项：required 执行 14 项，
full 执行 19 项，因为两个 quality variant 互斥。

## 候选运行证明的 Gate 事实

- Definition 选择 `repository-gate`，capacity 固定为 `4`。
- 每个 eligible Check 写入 per-invocation transcript；Product-owned progress 是唯一 shared progress stream。
- adapter 仅对 completed、无 warning、progress 成功、policy passed 且 eligibility 闭合的 result 返回 `0`。
  下列 tag-partial run 仅证明 N/A/eligibility，不证明 complete-Gate readiness。
- 正式 repository/CI 的 no-disabled-tag required/full 是 cutover calling contract；adapter 保留 local partial
  invocation，且不读取 ambient CI。

## 已执行证据

| 调用 | 结果 | 耗时 | 记录的本地位置 |
| --- | --- | --- | --- |
| legacy required | exit `0`; `11/11` | `13s` | `.log/verify/workspace/latest.log` from the final ordered acceptance |
| candidate required | exit `0`; `14 passed`, `6` profile N/A | `15s` | `/workspace/vibe-check/.log/project-gate/2026-08-20T09-52-27.067Z-3255134-b9a595ed-f759-406f-a212-edecec79aa7c` |
| legacy full | exit `0`; `16/16` | `17s` | `.log/verify/workspace/latest.log` from the final ordered acceptance |
| candidate full | exit `0`; `19 passed`, `1` profile N/A | `16s` | `/workspace/vibe-check/.log/project-gate/2026-08-20T09-53-09.257Z-3258788-e61d12a2-a9a8-4410-81ca-60829801bb49` |
| candidate required with `--disable-tag docs` | exit `0`; `10 passed`, `10` N/A | `13s` | `/workspace/vibe-check/.log/project-gate/2026-08-20T09-53-30.654Z-3260823-905dd66d-e8ac-45e0-acd5-c3b6d1b32ede` |

`.log/verify/workspace/latest.log` 已被最终顺序验收中的 legacy full run 覆盖：表中的 legacy required 结果是
该顺序验收的记录，不是当前 `latest.log` 的内容。所有 local log directories 都可变；记录的工作树变化后，
这些路径不构成 fresh evidence。

其他已完成证据：candidate preparation reused（exit `0`，`0s`）；focused Gate tests（`11` passing）与
foundation tests（`6` passing）；相邻 candidate lifecycle、isolated consumer 与 quality-run tests（`4` passing，`6s`）；
`bun run quality`（`3` checks、`0` records，`1s`）；以及 Test Evidence、scripts checks 与 independent Sol review。

## Cutover revalidation

在修改正式 root script、CI/workflow 或 legacy implementation 前，cutover Change 必须：

1. candidate package inputs、fingerprint、receipt 或 installed/resolved entry 变化时，重新运行 preparation 并刷新
   candidate identity；preparation 可以安全复用匹配 receipt，本次记录的 preparation 即为 reused，而非 fresh rebuild；
2. Gate implementation、stable owner content 或 manifest 变化时，刷新 manifest 并重跑 Gate acceptance；这类变化本身
   不要求 fresh rebuild；
3. 更新全部 root script、CI/workflow、文档与测试中的 legacy verifier 引用，确认旧 verifier 的引用为零后删除旧模块；以及
4. 接线正式 bindings 后，从实际接线后的 root/CI bindings 运行 no-disabled-tag required 和 full，在 `gate-handoff.md`
   记录 fresh evidence，并为 bindings 与 references 保留 VCS rollback boundary。
