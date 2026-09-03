# Design

本 Draft 将正式 Lizard 1.24.0 tag 作为唯一同步 oracle，先维护 source fidelity 与现有私有边界，再完成 reader parity、current evidence 和 legal/provenance 闭合。

## Context

当前 `functionMetrics` 是 Product-owned TypeScript analyzer：它通过 Check-private `analyzer/port-facade.ts` 接收已提供的 source，且仅由 Product adapter 消费；input admission、I/O、resource/cancellation、Finding、waiver、Record 和 settlement 都留在 port 外。稳定 owner 仍只承诺 27 readers、55 个大小写不敏感 suffix 与 NLOC、standard CCN、parameter count；没有 Python runtime、Lizard command、CLI 或 public parser/plugin surface。

`assess-lizard-upstream-release-and-branch-delta.md` 已确认 Lizard `1.24.0` tag（`308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`）是截至 2026-09-03 的正式 oracle。tag 之后 `master` 的 5 commits（截至调查时 HEAD `116eb410b199dea4ea36894165dfc0f1f0bbfe5a`）不是本 Change 内容。相对 1.23.0 的 translated analyzer closure 变动集中在 GoLike、Java（及新 `java_body_states`）、Objective-C、PHP（及新 `php_states`）、Python 与 script-language，必须进入同一个 release-aligned review，而非按热门语言裁切。`lizard.py` 是 mixed file：1.23→1.24 的实际字节 diff 位于 CLI/discovery/extension-help/main 等 excluded-entry ranges；translated ranges 因混合文件的行号偏移与 identity 仍须重新锚定和复核，但不得把该范围工作写成“translated behavior 已改变”。

当前 root provenance、current oracle/deviation/source-identity evidence 与 Gate exact exception ledger 仍指向 1.23.0。19 个 legacy optional concrete extension bodies 在 1.24.0 仍 unchanged；新增 Halstead 的三个 Python 文件同样尚无 Product consumer。两组 extension body 都保持 deferred。`--no-gitignore`、CSV/version/report/file-walk 输出 surfaces 与本 Change 无关。

## Goals / Non-Goals

Goals:

- 以正式 1.24.0 tag 更新 source/range identity、file-level provenance/legal inventory、current oracle/deviation evidence 和 parity corpus，同时保持 27-reader/55-suffix default capability。
- 以 source fidelity 为 translated core、protocol、shared state 和 readers 的首要质量规则；先复核 core/protocol closure，再按 reader family 接入和验证。
- 使 source identity、oracle、deviation、provenance/legal 与 Gate quality exception ledger 对同一 1.24.0 closure 可互相验证。

Non-Goals:

- 不采用、注册或公开任何 Lizard extension；不更改 FunctionMetrics options、limits、Finding metric、waiver、Record、message、final data 或 Product adapter DTO contract。
- 不引入 Python、Lizard executable、CLI、runtime network query、public analyzer/parser/plugin API 或 generic scanner framework。
- 不同步未发布 `master` 的额外 5 commits，不采纳 `--no-gitignore`，不实现 CSV/version/report/file-walk surfaces，也不把 Halstead 或 19 个 legacy bodies 混入 baseline sync。

## Decisions

### Intended Change

以 `1.24.0` tag，而非 `master` 或“latest”标签，作为唯一 source identity/oracle。翻译 changed analyzer closure：GoLike、Java 与新的 `java_body_states`、Objective-C、PHP 与新的 `php_states`、Python、script-language；对 `lizard.py` 和其他 mixed files 建立完整 range ledger，逐项重新锚定 translated、`deferred-extension-body` 与精确 `excluded-entry-surface`。`lizard.py` 的实际字节 diff 只在 CLI/discovery/extension-help/main 等 excluded-entry ranges；其 translated ranges 只因行号偏移/identity 重新锚定和复核，不主张 translated behavior 变化。先更新/验证 core 与 extension protocol、它们的 shared dependencies 和 processor order，再逐个 reader family 落地和进行 fidelity review，避免 reader 修复在旧 lifecycle 上被局部改写。

执行时保留已对齐的 private façade/Product adapter 分层：façade 只产生私有 Lizard-domain analysis，adapter 才映射既有 Product metrics。translated-only quality profile 继续服从 source-fidelity 规则；任何 Gate exception 必须是以 1.24 provenance/header 支持的精确 rule-path instance，并保留 parse/type/build、runtime、identity/deviation、oracle/parity、boundary 和 legal 检查。Draft 不创建 `tasks.md`、不运行 `plan`，也不表示实施授权。

### Resulting Impacts

- **Reader parity：** 为 changed closure 建立 1.24 oracle、normal/edge/malformed observations，覆盖函数 identity/range、NLOC、CCN、parameters、suffix selection 和 source order；default pipeline 必须证明没有 extension body 被注册。
- **Current evidence：** 更新 current source identity、reader-extension mapping、oracle observations 与 deviation ledger，使它们不读取 archive，也不把 1.23 evidence 与 1.24 source/range 混用。
- **Provenance/legal：** 更新 root 1.24 provenance、source hashes/ranges、SPDX/header/notice 和 shipped legal inventory；完整闭合 mixed-file range ledger（含 `lizard.py` 的 excluded-entry diff 与 translated-range re-anchoring），并明确 19 个 unchanged legacy body 与 3 个新增 Halstead files 均为 deferred。
- **Quality/Gate：** 对 exact translated paths/rules 重审 Gate exception ledger；只保留经 1.24 source-alignment 证明的最小例外，并验证 fixed target/source mapping、boundary imports 和 accepted exact-input behavior。
- **Stable owners and verification：** 同步实际受影响的 `functionMetrics`、scanner-dependencies、maintenance/advisory、testing evidence 与 legal owners；按受影响的 analyzer/adapter/integration tests、source identity/deviation/provenance guards 和 required workspace verification 给出直接证据。

## Risks / Trade-offs

正式 release 的 reader 修复可能改变既有 parity fixtures；按 source fidelity 接受经 oracle 证明的修复，而不是为了旧 fixture 保持行为。混合 source ranges、双许可 headers 或 Gate exceptions 若未同源更新，会造成 identity/legal/quality evidence 相互矛盾；root provenance 是唯一 machine-readable mapping，current evidence 只能引用和验证它。全 reader closure 使工作量高于针对单一语言的 patch，但避免公开 55-suffix contract 与实际 source baseline 脱节。

`master` 的未发布修复看似相关却没有 release identity；排除它们意味着下一正式 release 仍需独立调查和 Change。extension adoption 可先收集消费者选择证据，但其 runtime 变更不属于本 Change。

## Open Questions

无。正式 oracle、同步范围、deferred extension 边界和私有 Product boundary 已由当前 stable owners 与两份调查报告确定；实施仍须取得后续明确授权并在进入 Plan 前派生任务与验证。
