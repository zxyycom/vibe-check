# Tasks

按 source identity、lifecycle closure、reader family、evidence/contract、review 和分层 Gate 的顺序推进；所有 checkbox 只在相应产物和直接证据实际完成后勾选。

## Readiness

- [x] 0.1 复核 `1.24.0` tag commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`、`1.23.0..1.24.0` source diff 与两份调查报告；记录本 Change 只纳入 tag、排除 tag 后 `master` 5 commits、CLI/report/discovery/`--no-gitignore`/CSV/version/file-walk surfaces 的可复核输入。
- [x] 0.2 从现有 root provenance 和 analyzer targets 制作 release-wide source/range closure checklist：逐项标出 translated、`deferred-extension-body` 或精确 `excluded-entry-surface`，覆盖 GoLike、Java/`java_body_states`、Objective-C、PHP/`php_states`、Python、script-language、shared/core/protocol 与 mixed `lizard.py`。
- [x] 0.3 为 `lizard.py` 单独确认“excluded-only byte diff”与“translated-range re-anchoring”两个不同事实；列出每个新/移动 range 的 source identity、target、license/header 和 validation owner，禁止将行号偏移表述为 translated behavior diff。
- [x] 0.4 审计当前 1.23 fixture/evidence、legal inventory、identity/deviation guards、translated-only Gate exception ledger、相邻 tests 和 testing Cases，确定每个 1.24 replacement 的唯一 current owner；若将改动原生 test nodes/body/Case Owner/Proves，先运行 `bun run test-evidence -- check --root .` 并维护 Case ledger。
- [x] 0.5 确认实现顺序与边界：core/protocol/shared state/registry processor order 先于 reader family；默认 registry 继续 27 readers/55 suffixes，19 legacy concrete bodies 和 3 Halstead files 全部 deferred/no registration，`adopt-selected-lizard-extensions` 不在本 Change 实施范围。

## Implementation

- [x] 1.1 更新 root Lizard provenance 和 shipped legal inventory 至固定 1.24 tag：source hashes、range-to-target mappings、SPDX/header/notice、translated/deferred/excluded classifications 同步落地，并让 19 legacy body、3 Halstead files和 `lizard.py` mixed ranges具备完整可审计条目。
- [x] 1.2 以 1.24 source 对齐 analyzer core、extension protocol、shared state、registry 和 processor order；保持 façade/adapter/Worker 的 Check-private ownership、exact-input handoff、resource/cancellation 与 Product DTO boundary 不变。
- [x] 1.3 翻译并审阅 GoLike shared reader 的 generic-function/type-parameter correction，覆盖其 Go、Scala、Kotlin、Rust、Swift、Zig 和 Solidity consumers；更新所需 shared/reader tests 和 1.24 oracle observations。
- [x] 1.4 翻译并审阅 Java reader 与 `java_body_states` closure，覆盖 static block、field-initializer anonymous class、contextual `record`、generic/qualified anonymous type 的 identity/complexity behavior；以 normal、edge、malformed corpus更新 tests/evidence。
- [x] 1.5 翻译并审阅 Objective-C block/function-pointer parameter nesting correction，保持 function boundaries、parameter count、NLOC 与 CCN source fidelity；更新最窄 test/oracle evidence。
- [x] 1.6 翻译并审阅 PHP reader 与 `php_states` state-machine closure，覆盖 modern class/trait/visibility、constructor promotion、match、arrow function、union type、named argument 及 null-coalescing/nullsafe nesting behavior；更新最窄 test/oracle evidence。
- [x] 1.7 翻译并审阅 Python f-string interpolation control-flow 和 script-language trailing-backslash/comment continuation corrections；以 normal、edge、malformed observations 验证 source order、identity/range、NLOC、CCN 和 parameters。
- [x] 1.8 将 current analyzer evidence 成组迁移到 `lizard-1.24.0`：source identity、reader-extension mapping、normal/edge/malformed oracle observations 与 deviation ledger 只引用 root provenance，不读取 archive、不保留 1.23/1.24 混合断言，并更新对应 source-identity/deviation guards。
- [x] 1.9 更新 affected analyzer core/reader/registry/port-façade/adapter and functionMetrics integration tests；证明 27-reader/55-suffix registry、optional-extension non-registration、private import boundary、whole exact-input mapping、existing public metric/result contract、resource/cancellation and unavailable semantics未回归。若测试正文或 Case 语义改变，维护 affected `function-metrics-analyzers`、translated analyzer、check-owned scanner/repository-tooling Cases 并再次运行 test-evidence check。
- [x] 1.10 审查并最小化 translated-only quality/Gate exception ledger：每个保留例外都必须链接 exact rule-path 与 1.24 provenance/header；移除无来源、重复或已不需要的例外，且不得把 source-fidelity 例外扩展到 façade、adapter、Worker、Check 或 tests。
- [x] 1.11 完成 correctness-only implementation review：按 source ledger 对照 1.24 tag 检查所有 translated range、deferred/excluded boundary、reader corpus 和 Product boundary；将发现的 correctness defect 先修复并以最窄测试重证，不在此步骤进行风格性重写。
- [x] 1.12 在 correctness review 通过后，完成 ai-ready/code-norm optimization review：只对命名、局部结构、注释/证据可读性、重复和项目规范合规做最小优化，复核其不改变 source-aligned semantics、public contract、provenance mapping 或 Gate exception scope，并保留可审计 diff。

## Verification

- [x] 2.1 运行每个受影响 core/protocol/shared/reader family 的最窄 unit tests、port façade/adapter tests 和 `functionMetrics` integration tests；记录 1.24 normal、edge、malformed oracle/parity evidence以及 27 readers/55 suffixes、extension non-registration、exact-input/private-boundary coverage。
- [x] 2.2 运行 source-identity、reader mapping、oracle/deviation、root provenance/legal/header/notice 和 Gate-exception guards；确认 current evidence 不读 archive、无 1.23/1.24 mixed mapping，且 `lizard.py` 的 excluded byte diff 与 translated re-anchoring 都由 ledger 证明。
- [x] 2.3 在任何测试正文、节点或 Case evidence 变更后运行 `bun run test-evidence -- check --root .`，并运行相关 documentation/owner validation，确认 Case Owner/Proves、stable docs、advisory baseline 与 implementation/evidence 没有矛盾。
- [x] 2.4 运行 `bun run verify:vibe-check-workspace:required`；处理所有与本 Change 有关的 failure，保留 required Gate 的 actual result、quality exception evidence和未覆盖边界说明。
- [x] 2.5 在 required Gate 与 correctness/optimization review 均通过后运行 `bun run verify:vibe-check-workspace:full`；确认 full profile 的 actual result，并复核任何 required/full difference 没有暴露 source fidelity、legal/provenance、boundary 或 public-contract regression。
- [x] 2.6 审阅 proposal 的全部 Success Criteria、design 的 Open Questions/risks、稳定 owner 同步与所有 task evidence；运行 `bun run change-plan -- check changes/sync-lizard-typescript-port-to-1-24-0`，在获得单独归档授权前保持 active Plan，不归档、不合并 extension adoption Change。
