# Cutover Readiness Evidence

本文记录 `replace-workspace-verifier-with-project-gate` 在正式 binding 写入前的 current readiness evidence。它证明 Project Gate 可以进入 cutover，不证明 bindings 已切换、legacy verifier 已删除或 Change 已完成。

## Workspace boundary

- Evidence revision：`0b382d8bca6fc17541e79f4444400354df6c739b`。
- Runtime：Bun `1.3.14`，`linux-x64`。
- Ordered acceptance 前后 `git status --short` 相同；执行期间没有编辑 tracked files。工作树中只有本 Change 的 artifacts 处于修改或新增状态。
- Readiness audit 未发现 `.github`、`.circleci`、`.buildkite` 或其它 repository CI workflow 文件。Implementation task 1.2 在 binding 写入前重新发现，最终状态进入 `gate-handoff.md`。

## Candidate identity

| Field | Value |
| --- | --- |
| Candidate version | `0.0.0-local.14c849cd8f47` |
| Input fingerprint | `14c849cd8f47f68c94e0db389fc8937e3b7d3fe59c5aee8732c6c04f01d96cc1` |
| Exact tarball | `/workspace/vibe-check/.cache/vibe-check/package-candidate/artifacts/vibe-check-0.0.0-local.14c849cd8f47.tgz` |
| Tarball SHA-256 | `2be56847f0eed153c5a63723fd48c6d7bb19fb38ddd42f61fab2dec55dc9b46b` |
| Installed/resolved entry | `/workspace/vibe-check/scripts/quality/node_modules/vibe-check/index.mjs` |
| Preparation | 复用 matching receipt；artifact audit 与 installed-entry identity 通过 |
| Package file count | `144` |

Candidate identity 与归档 readiness 相同，因此不需要 fresh rebuild；复用只表示 receipt、tarball、installation 与 resolved entry 匹配当前 inputs，不表示 Gate acceptance 可以跳过。

## Gate manifest

Manifest 对归档 handoff 声明的相同 15-file scope 使用相同算法：按 byte order 排序 POSIX-relative path，对每个文件依次 hash `path + NUL + raw bytes + NUL`。

| Field | Value |
| --- | --- |
| File count | `15` |
| Current manifest SHA-256 | `d1448b7b8acb473969ce32a5ce61453d3020b3eb9e4eefe345b10a9781377408` |
| Archived manifest SHA-256 | `afe712b92e78b88757ab3137b89adea49cd460826adb37a937c48620497fa46a` |

Scope：

- `scripts/project-gate/**` 与 `scripts/quality/project-gate/**` 下全部 regular files。
- `docs/script-tooling.md`。
- `docs/testing/cases/repository-tooling.md`。
- `scripts/tools/foundation/src/process/types.ts`。
- `scripts/tools/foundation/src/process/runner.ts`。
- `scripts/tools/foundation/test/foundation.test.ts`。

Current digest 与 archived digest 不同，因此本轮没有沿用形成时 Gate acceptance；下节记录了 current manifest 的 fresh evidence。

## Executed evidence

所有 complete-profile invocations 均未传 disabled tags。Partial invocation 只证明 eligibility，不构成 complete-Gate readiness。

| Evidence | Result | Elapsed | Local log boundary |
| --- | --- | --- | --- |
| Focused Gate tests | 3 个文件，`11 passed / 0 failed` | `343ms` | 只见 test process output；无 durable log |
| Strict Test Evidence | `196` current Bun entities mapped by `47` Cases across `10` topics | 未单独计时 | 只见 test process output；无 durable log |
| Legacy required | exit `0`; `11/11 passed` | `16s` | `.log/verify/workspace/latest.log` 随后被 legacy full 覆盖 |
| Candidate required | exit `0`; `14 passed`, `6 profile N/A` | `15.4s` | `.log/project-gate/2026-08-20T15-19-39.075Z-3318993-c0babe54-ce02-4cad-a093-4aff93853986` |
| Legacy full | exit `0`; `16/16 passed` | `17s` | `.log/verify/workspace/latest.log` |
| Candidate full | exit `0`; `19 passed`, `1 profile N/A` | `17.4s` | `.log/project-gate/2026-08-20T15-20-12.179Z-3322560-e885a3ba-d5ad-437d-972f-79049737b2c8` |
| Candidate required with `--disable-tag docs` | exit `0`; `10 passed`, `10 N/A` | `15.3s` | `.log/project-gate/2026-08-20T15-20-29.792Z-3324585-a5c22d05-800b-4102-9911-8a1e40f4f46a` |

Candidate required/full 保持 20-Check mapping、required `14` / full `19` eligibility、Product progress、per-Check transcripts、`repository-gate` policy 与 adapter exit closure。Docs-disabled run 产生 4 个 `tag-disabled` 和 6 个 `profile-excluded` outcomes，不削弱 complete-profile evidence。

Local `.log/**` paths 是 ignored diagnostic state，不是 durable artifacts。上表的 counts、identities 与 evidence boundaries 是持久 readiness record；重新验证条件成立时必须重跑命令，不能依赖 local log retention。

## Readiness conclusion

Tasks 0.1–0.4 已满足。Project Gate 匹配 current candidate 与 current 15-file Gate scope；complete required/full profiles 均通过；partial eligibility 保持 local-only；没有未解决的 Decision 或设计选择阻塞实施。Task 1.1 可以直接开始。

在 1.1 前出现以下任一条件时，重跑 tasks 0.2–0.4：

1. Candidate input fingerprint、receipt、tarball、installed package 或 resolved entry 发生变化。
2. 15-file Gate manifest scope 中任一文件发生变化。

只修改本 Change 目录或 Git commit identity 不会使 readiness evidence 失效。1.1 之后由 `tasks.md` 的 Verification section 提供 binding-specific evidence；本 pre-cutover record 不能代替该证据。
