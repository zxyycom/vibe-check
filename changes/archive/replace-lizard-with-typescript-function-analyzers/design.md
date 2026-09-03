# Design

本设计以 `functionMetrics` 的 public contract 为边界，将 Lizard 1.23.0 的完整 source-aligned analyzer dependency closure 忠实翻译为 Product-owned TypeScript，并以一次 hard cut 移除外部 runtime。

## Context

实施前，`functionMetrics` 通过 local `lizard/**` adapter 执行 Lizard 1.23、解析 CSV，并由 `scanner.executable` 选择该路径。当前 source tree 已改为由 parent exact-path admission 和一个 Check-owned Worker 驱动内置 analyzer：Worker 只接收 `{ path, source }`，不发现或读取路径；`FunctionMetricsOptions` 与 resolved options 均不再公开 `scanner`。固定 reader registry 为 27 readers / 55 case-insensitive extensions，输入上限为每文件 `8 MiB`、一次 accepted aggregate `64 MiB`。

这不是已完成发布的同义词。current candidate/installed consumer 与 workspace required/full Gate 已验证完整 Change acceptance，三条长期 Decisions 也已对齐到当前事实。Change 保持 active 仅因归档需要明确授权。当前 contract、source/range/provenance、resource 与 package evidence 的入口见本 Change `evidence/`；稳定行为 owner 是 [`docs/checks/function-metrics.md`](../../docs/checks/function-metrics.md)。

## Goals / Non-Goals

**Goals**

- 在不收窄当前语言面的前提下移除 formal Product 与 installed package 的 Python/Lizard runtime dependency。
- 保持 owner-level observable behavior，包括 Finding waiver、Records、final data、exact inputs、failure 与 cancellation contract。
- 用 source-to-owner/provenance ledger、upstream-aligned reader boundaries 与 differential corpus 控制首次翻译和后续同步的语义偏差。
- 让 explicit-only upstream advisory 发现 stable release，而不使网络状态影响默认 Product Run 或 Project Gate。

**Non-Goals**

- 首次 hard cut 不升级到 Lizard 1.24，不新增或收窄 supported languages、metrics、Finding policy、public parser API 或完整 syntax-validity contract。
- 不修改 SCC/fileMetrics，不建立跨 Check generic scanner/parser framework，不提供 public backend/parser/language-plugin selection。
- 不保留 feature flag、dual backend、silent fallback、deprecation shim 或仅覆盖高流行度语言的 production path。
- 不新增 functionMetrics persistent cache；不以移除 subprocess timeout 为由接受无界 Product runtime work。

## Decisions

### Intended Change

1. **固定 oracle 与完整 closure。** 首轮固定 Lizard `1.23.0` revision `06284ec87c1966fee4ddbf3f068ccf89b987b0f8`。core processor lifecycle、shared reader dependencies 与完整 internal extension protocol 都在范围内；27 readers / 55 registered extensions 已启用。19 个 optional concrete extension body 保持明确的 `deferred-extension-body` 且未注册；1.24+ 的采用必须使用独立 Change。
2. **source-aligned reader ownership。** 保留 in-range module/class/function/field/state/processor lifecycle，而不缩减为当前测试到的调用路径。source identity manifest、provenance ledger 与 deviation ledger 使宿主 seam 可审计；只有多个真实 reader 和 corpus 共同证明的义务才成为 shared helper。
3. **Worker 与 Product 边界。** 已选模型是在 byte-bounded exact-path admission 后启动一个 Check-owned Worker。parent 的 `32 KiB` reads、单文件 `8 MiB`、aggregate `64 MiB`、cancellation checkpoints、whole-result settlement 与 worker termination 都是 Product 责任；reader 不发现或重读文件。这是已确定的执行设计，不保留另一 execution-model 备选路径。
4. **hard cut，无 fallback。** source-tree measurement 已使用 TypeScript analyzer，不再包含 Lizard probe/process/parser/CSV adapter、Python/Lizard tool binding、production fallback 或 public `scanner.executable`。candidate、installed-consumer 与 workspace-Gate verification 已证明同一 hard cut 的交付，不重新开放 backend 选择。
5. **显式 maintenance advisory。** `bun run maintenance:lizard-upstream` 是 opt-in 的 repository maintenance command。它用 bounded、credential-free transport 比较 fixed baseline 与 GitHub official HTTPS release endpoint；`no-update`、`update-available` 与 `unavailable` 都是 advisory。它不是 package API，且不在 default Gate。
6. **legal inventory 不进入使用文档。** 文件 header 指向 source、revision、SPDX 与 modification facts。ledger 驱动 `THIRD_PARTY_NOTICES.md` 与 `licenses/**`；README 和 function-metrics guide 只保留用户相关的 provenance 边界。

### Resulting Impacts

- internal extension protocol 可使用多个 upstream-aligned modules，但不存在 consumer-selectable backend、parser 或 language-plugin surface；deferred body 不形成 fallback。
- Product 拥有后续 upstream synchronization。advisory 发现 release，但不授权升级、不替代 corpus/provenance review，也不修改 repository state。
- consumer migration 是 hard cut：public options、runtime validation、docs、candidate 与 installed acceptance 必须一致证明 `scanner.executable` 已删除。
- legal closure 由 ledger 驱动并归 package owner；Pygments/Lizard provenance material 不是 runtime dependency。
- repository Gate 默认保持离线；SCC 保留其独立 external dependency 边界。

## Risks / Trade-offs

- 完整 source fidelity 保留 upstream 结构与 quirks，增加迁移体量，却避免常见 fixture 掩盖 lifecycle 和 tokenizer 遗漏。
- Worker 移除了 subprocess isolation，但增加 source text materialization 与 worker lifecycle 工作；明确 byte caps 与 cancellation tests 控制这项有界取舍。
- resource spike 是 observation，不是 latency/RSS acceptance budget。维护者必须判断记录的成本是否支持未来预算；它不推出 generic pool、cache 或 scanner framework。
- 混合 provenance 增加 artifact verification 工作，但这些材料留在独立 legal inventory，而不进入 README 或 user guide。

## Open Questions

以下边界不阻塞本 Change 的已完成验收，也不因 Change 仍 active 而变成待实现任务：

- resource spike 记录 latency 和 process-wide maxRSS，却没有 declared product budget。若 release 需要 pass/fail performance threshold，维护者必须通过独立 measured Decision 建立它，不能从本证据推断。
- physical symlink containment 仍归 `project-files` owner；本 Change 只验证 analyzer 的 exact-input ownership，不扩大该边界。
