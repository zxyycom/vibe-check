执行顺序是文档调整、Rust 产品删除、TypeScript/Bun 源码迁移、正式入口接线和行为对照。Rust 只属于删除任务，迁移任务只使用固定版本的 TypeScript/Bun 源码与测试资产。

## 0. Change 审计门禁

- [x] 0.1 重新审核 proposal、design、全部 delta specs 和 tasks 的目标、内容 owner、范围与执行顺序；确认 active main-spec requirements 已由本 change 覆盖，两个代码任务相互独立，文档先行，且没有未回答问题或起草期状态说明。
- [x] 0.2 运行 `bun run validate`、`openspec validate promote-typescript-quality-tooling-to-product --strict`、`openspec show promote-typescript-quality-tooling-to-product --deltas-only`、requirement-name audit、起草期关键词检查和局部 diff 审查；change artifacts 无阻塞问题后再进入 1.x 文档任务。

## 1. 文档先行

- [x] 1.1 更新 `docs/architecture.md`、`docs/coding-style.md`、`docs/cli.md`、`docs/scan-scope.md`、`docs/quality-metrics.md`、`docs/output.md`、`docs/scanner-dependencies.md`、`docs/script-tooling.md`、`docs/testing.md`、`docs/navigation.md` 和 `AGENTS.md` 中受本 change 直接影响的 owner、路径、入口与实现状态；分别描述 Rust 删除和 TypeScript 产品归位，代码完成前继续明确标注当前实现状态。
- [x] 1.2 对照本 change 的 `cli-contract`、`output-contract`、`quality-metrics`、`scan-scope`、`duplicate-scanning`、`structural-scanning` 和 `test-fixtures` delta，确认长期文档退役 Rust CLI、human/JSON output、blocking gate、schema/example ownership、metrics、scan scope、scanner 与 fixture requirements，并记录现有 TypeScript/Bun CLI、artifact、metrics owner、collection、jscpd 和 Python/Lizard boundary；现有 TypeScript 测试资产原样上移，不在本 change 中补建缺失 coverage。配置、输出、scanner algorithm、gate、schema/examples 和其它质量规则保持不变只指 pinned TypeScript consumer behavior，不保留 Rust contract。
- [x] 1.3 运行 `bun run validate`、严格 OpenSpec validation、Rust-current-state 关键词检查和局部 diff 审查；文档门禁通过后再开始代码切片。
- [x] 1.4 在进入 2.x 前确认 pinned quality-core `3acea8c2f643ea86f7a1e8f2a6db716b7e320c76` 与 foundation `f593edbf55fd03be7db54ef44a38d0a9feda4dbd` 源码可读取，并记录 consumer 仓库 revision；任一来源不可用时停止代码切片。
  - Provenance gate observed `2026-07-17T08:55:02Z`: PASS。Consumer revision
    `eae25aee64a5b4ecef4b02e8e86d8d39c4ab122d` on
    `codex/productize-typescript-quality-tooling`；quality-core 与 foundation pins 的完整 tree
    均可从本地 module object database 读取。Quality-core worktree 未初始化，3.x 必须按
    exact pin 从 object database 提取，不得从空 worktree 或未限定的 `HEAD` 复制。
  - Planning/document gate observed `2026-07-17T09:31:40Z`: PASS。审查覆盖全部 change
    artifacts、四个相关 active main specs 和 11 份 owner docs；63 deltas 的 requirement-name
    audit 通过，四个主 specs 的 39/40 requirements 已覆盖且只保留
    `Scan scope owner documentation`。`bun run validate`、strict change validation、
    起草期/Rust-current-state 检查和局部 diff 审查均通过，无 Medium+ finding。

## 2. 删除 Rust 产品

- [x] 2.1 完整删除 `crates/vibe-check/**`，包括 Rust 源码、测试和 fixtures；不得把其中任何资产移动、复制或改写到 `src/product/**`。
  - Rust deletion review observed `2026-07-17T09:51:56Z`: PASS。`crates/vibe-check/**`
    不存在；`src/product/**` 的精确 TypeScript provenance 证明未混入 Rust 资产。
- [x] 2.2 删除根 Cargo 产品 workspace、Cargo lockfile、Rust toolchain 配置和仅服务 Rust 产品的构建 helper。
- [x] 2.3 删除 package scripts、workspace verifier、CI 和仓库配置中的 Rust 产品执行接线，并检查仓库不再存在可构建或可调用的 Rust Vibe Check 产品入口。
  - Repository wiring review observed `2026-07-17T10:11:08Z`: PASS。Cargo workspace、
    lockfile、toolchain、Rust product helper 与执行接线均已移除；当前文件系统不存在可构建
    或可调用的 Rust Vibe Check 产品入口，workspace verifier 已以 product
    typecheck、lint 和 test gate 替代 Rust gate，无 Medium+ finding。

## 3. 迁移 TypeScript/Bun 产品源码

- [x] 3.1 只使用 1.4 记录的 TypeScript/Bun 来源 revision，将 pinned quality-core source、测试和 fixtures 直接迁移到 `src/product/**`，并在 `src/product/README.md` 记录来源 commit 和仓库所有权。
- [x] 3.2 将现有 scan 入口、参数、默认配置及实际可达的 foundation helper 闭包移动到 `src/product/**`，只做路径和所有权所需的机械调整。
  - Source lift review observed `2026-07-17T09:51:56Z`: PASS。quality-core
    `86/86` blobs、consumer 三文件 import-only diff、foundation `15/15` reachable
    closure 与 deletion-only index 均通过；product import audit、`tsgo`、30 tests、
    diff check 和 strict change validation 通过，无 Medium+ finding。
  - Post-cleanup single-owner review observed `2026-07-17T11:52:37Z`: PASS。
    CodeGraph 与精确 import audit 确认旧 `scripts/quality/args.ts`、
    `scripts/quality/config.ts` 已删除且无运行时消费者；scan wrapper 仅调用
    `runProductCli -> runScan -> parseArgs / runQualityScan`，参数、默认配置与 core
    owner 均位于 `src/product/**`。Formal/wrapper help stdout byte-equal，
    unknown-command 与普通/特殊 error mapping、product/scripts typecheck 和 lint、
    product tests `37/37` 均通过，无 Medium+ finding。
- [x] 3.3 从 dogfood 默认配置删除已失效的 Rust 产品与 Cargo 路径，并按现有 TypeScript 配置结构增加 `src/product/**` source area；threshold、profile、scanner、warning、baseline、artifact 和 gate 算法保持不变。
- [x] 3.4 移除 quality-core gitlink 与对应 `.gitmodules` 条目，增加 import boundary 检查，并对照固定 TypeScript 来源确认差异只包含路径/import、入口/wrapper、仓库所有权、TypeScript fixture/test 搬移、dogfood 路径调整和必要构建接线。
  - Product wiring review observed `2026-07-17T10:11:08Z`: PASS。Consumer config
    的预期差异仅包含 import 重定向和 dogfood ownership 调整：删除 Rust/Cargo source
    areas 与失效 accepted warnings，并增加 `src/product/**` area；未改 threshold、
    profile、scanner、warning、baseline、artifact 或 gate 算法。Quality-core pinned
    source `86/86` blobs 一致，运行时 import 不再依赖 scripts/toolkit，gitlink 只保留
    foundation 与 parallel。Product/scripts
    static checks、30 tests、frozen offline install、override quality/required `7/7`/full
    `10/10`、`bun run validate`、strict change validation 和 worktree/cached diff check
    均通过。裸 `quality:check` 的系统 `python3` 缺少 `lizard` module；默认 command
    与迁移前一致，使用现有 `.venv/bin/python` override 后通过，归因为环境依赖而非接线回归。

## 4. 建立单一产品入口

- [x] 4.1 增加最薄的 `bun run product:cli -- scan [project-root]` 分流，复用上移后的参数解析、默认配置和扫描核心；省略 project root 时使用启动 cwd。
- [x] 4.2 将 `scripts/quality/scan.ts` 和 `quality:check`、`quality:full-check`、`quality:scan` 改为单向调用产品入口的薄 wrapper，并显式传入 Vibe Check 仓库根。
- [x] 4.3 用入口测试证明正式命令和 dogfood 命令到达同一核心，并保持现有 flags、stdout/stderr 和状态映射。
  - Product entry review observed `2026-07-17T10:27:43Z`: PASS。CodeGraph 与静态
    import 审计确认正式入口和 dogfood wrapper 单向到达
    `runProductCli -> runScan -> parseArgs / runQualityScan`，产品源码不反向导入
    `scripts/**`；入口只保留 operation/root/status 分流和服务 parser、config、banner、core
    绑定的最小 runner seam，没有第二套 parser/status mapping 或 framework/service
    abstraction。Focused tests `7/7`、product tests `37/37`、product/scripts typecheck 与
    lint、formal/wrapper help、显式 root quick scan 和 unknown-command smoke 均通过；使用
    `.venv/bin` scanner override 的 `quality:check`、required `7/7`、full `10/10`、
    `bun run validate`、strict change validation 和 diff check 均通过，无 Medium+ finding。

## 5. 行为保持与交付

- [x] 5.1 运行 product import、typecheck、lint、test、dependency 和入口检查，修复且只修复由源码移动、入口接线或 dogfood 路径映射造成的错误。
  - Product acceptance observed `2026-07-17T10:32:52Z`: PASS。CodeGraph 与 TypeScript AST
    audit 确认 `scripts/quality/scan.ts -> runProductCli -> runScan ->
    parseArgs / runQualityScan` 且 runtime relative imports 全部留在 `src/product/**`；
    module import、product typecheck、lint 和 tests `37/37` 通过。Frozen offline install
    与 dependency/lock/gitlink audit 通过，依赖没有因迁移增加多余项。Formal/wrapper help、
    unknown-command exit `2` 和显式 root quick smoke 通过；quick smoke 使用现有
    `VIBE_CHECK_LIZARD_CMD=.venv/bin/python`。Strict change validation、worktree/cached
    diff check 均通过，无迁移错误、无需源码修复、无 Medium+ finding。
- [x] 5.2 使用迁移后的 TypeScript test fixtures 建立隔离的 Git fixture project，固定 baseline/current commits 和显式 changed-files 输入；让 pinned 上移前 TypeScript consumer 与新产品入口扫描同一 project，并完成 quick 对照。
- [x] 5.3 对同一 current/baseline revisions 使用上移前 TypeScript consumer 与新产品入口执行 full 和 with-baseline 扫描，比较 baseline、changed warnings、完整 warnings 和报告数据。
- [x] 5.4 使用同一显式 changed-files 输入对照上移前 TypeScript consumer 与新产品入口，确认 changed warning context 和相关 artifacts 保持。
  - TypeScript behavior parity observed `2026-07-17T11:22:43Z`: PASS。Pinned consumer
    `eae25aee64a5b4ecef4b02e8e86d8d39c4ab122d`、quality-core
    `3acea8c2f643ea86f7a1e8f2a6db716b7e320c76` 与 foundation
    `f593edbf55fd03be7db54ef44a38d0a9feda4dbd`；隔离 fixture baseline/current 为
    `61ec7340cd922e57eac0049a0ebb8f60a4060062` /
    `949c319316716434a366cf3cda94a51e17b3b84e`，唯一 current change 与显式
    changed-files 均为 `scripts/quality/high-token-module.ts`。固定工具为 Bun `1.3.14`、
    scc `3.7.0`、Lizard `1.23.0`、jscpd `5.0.11`。
  - Quick 作为门禁后，依次执行 `quick`、`full --skip-baseline`、
    `full --with-baseline` 和 `full --baseline <baseline> --changed-files <file>`；
    old/new 使用同一 fixture、revision、changed-files、工具与逐次清空的 cache。
    Metrics whitelist 仅为 `/metadata/timestamp`、精确
    `/metadata/scope/include` ownership arrays（old：
    `crates/**/*.rs`、`scripts/cargo/**/*.ts`、`scripts/docs/**/*.ts`、
    `scripts/quality/**/*.ts`、`scripts/tools/*.ts`、
    `scripts/tools/validators/**/*.ts`、`scripts/vibe-check-workspace/**/*.ts`、
    `docs/**/*.md`、`docs/**/*.json`、`openspec/**/*.md`；new：
    `src/product/**/*.ts`、`scripts/docs/**/*.ts`、`scripts/quality/**/*.ts`、
    `scripts/tools/*.ts`、`scripts/tools/validators/**/*.ts`、
    `scripts/vibe-check-workspace/**/*.ts`、`docs/**/*.md`、`docs/**/*.json`、
    `openspec/**/*.md`），以及 full modes 中仅 old 存在的三条完整
    `quality-accepted-warning-unmatched` records：Rust runtime tests `424` code lines、
    ast-grep characterization `349` code lines、Python structural scanner `11` CC；
    harness 对每条完整字段、message 与 suggestion 做精确 identity 断言，不按 rule
    泛化过滤。Quick stdout 仅替换精确 artifact-dir strings。
  - 两个 baseline modes 的 raw stdout 均不相等；每个 old/new run 仅允许两种各出现一次的
    typed token：已验证且 run 后删除的绝对
    `/tmp/quality-baseline-<UUIDv4+variant>/repo` path，以及由各 side config、baseline
    commit 与工具 identity 独立重建的 SHA256 cache-key `12` 字符 console prefix。
    Fixed messages 保留，唯一 full-key directory、manifest `cacheKey` / `identity` 与
    snapshot 均已验证，剩余 stdout byte-equal；每个 mode 的 disallowed differences
    为 `0`。Raw scanner/baseline artifacts 未 normalization 即 byte/deep equal；
    changed/all warnings、regenerated reports、status、stderr 与 artifact sets 均通过严格对照。
  - Ephemeral harness
    `/tmp/vibe-check-parity-5.2-5.4-aPwpp8/harness.ts` SHA256
    `145bf2b553f6adff821ad0f3730796465e75ea0139778d5be5369e08b1c140fb`；
    evidence `/tmp/vibe-check-parity-5.2-5.4-aPwpp8/evidence.json` SHA256
    `298ab5ea5eaddeb082df8268a543983e6033a99562942cb0bd4918ae94ab87ca`；
    同目录 `checksums.json` sidecar 与两者一致。最终 bounded review 无 Medium+
    finding；5.2–5.4 验收完成。
- [x] 5.5 运行迁移后的 `quality:check`、`quality:full-check`、`quality:scan` 和 `bun run verify:vibe-check-workspace:full`；任何非源码位置、入口或明确非语义字段造成的行为变化都阻塞完成。
  - 四条命令均使用 `VIBE_CHECK_LIZARD_CMD=.venv/bin/python`，工具版本为 Bun
    `1.3.14`、Lizard `1.23.0`、scc `3.7.0`、jscpd `5.0.11`。`quality:check`
    exit `0` / `passed`，artifact 为 `artifacts/vibe-check-quality/quick/`；
    `quality:full-check` exit `0` / `passed`，artifact 为
    `artifacts/vibe-check-quality/`；`quality:scan` exit `0` / `passed`，artifact
    同为 `artifacts/vibe-check-quality/`。post-cleanup revalidation observed
    `2026-07-17T11:52:37Z`；三次扫描均收集 `215` files、`723`
    functions、`0` duplicate fragments 和 `0` warnings；full-check 的历史 baseline
    因已删除的 `scripts/tools/quality-core` gitlink 无法物化，按 pinned
    baseline-unavailable mapping 保持 `passed`，隔离 fixture 的 baseline 语义已由
    5.3 parity 证明。
  - `bun run verify:vibe-check-workspace:full` exit `0` / `passed`，`10/10`
    checks 通过，日志为 `.log/verify/workspace/latest.log`。Product/scripts
    typecheck、lint 均通过，迁移测试为 `37/37`；正式入口与 dogfood wrapper help
    stdout byte-equal，wrapper 单向调用 `runProductCli`、`runScan` 和同一
    `runQualityScan` core。`bun run validate`、strict change validation 和
    `git diff --check` 均通过；执行前后 git status SHA256 均为
    `a353a02bc475d454957df1bb95d9f03ed1975d4d233bd7f8e674943bc9be3e85`，
    index tree 均为 `35363c543761e39337966e9d641174df930b958c`；
    生成的 artifact、cache 与 verifier log 均被忽略，tracked worktree/index 未受污染。
- [x] 5.6 更新被迁移 TypeScript 测试的 `docs/testing/cases.md` 路径和状态，将长期文档的实现状态收口为产品化完成状态，并把发现的既有问题交给后续 change；随后运行 `bun run validate`、严格 OpenSpec validation、Rust 产品路径关键词检查和局部 diff 审查。
  - Final docs/case review observed `2026-07-17T12:14:55Z`: PASS。11 份长期 owner
    docs 与 `AGENTS.md` 已收口为 `src/product/**` 唯一 TypeScript/Bun runtime、正式
    `product:cli` 与单向 dogfood wrapper 的当前状态；Rust output 仅保留明确退役的历史
    材料，productization parity 明确为一次性迁移证据。Case ledger 删除 `16` 个已退役
    Rust cases，将 `9` 个 quality cases 更新到存在的 `src/product/**` tests，所有
    `@case` markers 唯一且 `AUX-PARALLEL-RUNNER-001` 保留。
  - 相对 changed-files/fallback ignore 与两条过时 Rust report notices 分别进入 gated
    follow-up changes `stabilize-scan-input-path-and-ignore-semantics` 和
    `replace-retired-rust-report-notices`；两者 planning artifacts 完整、首项实现前门禁
    未解除，strict validation 通过，不阻塞本次纯源码归位。
  - Final validation PASS：product/scripts typecheck 与 lint、product tests `37/37`、
    formal/wrapper help byte-equal、`bun run validate`、strict OpenSpec current/all
    `11/11` 和 worktree/cached diff checks 均通过。使用
    `VIBE_CHECK_LIZARD_CMD=.venv/bin/python` 的 `quality:check`、
    `quality:full-check`、`quality:scan` 均 exit `0` / `passed`，收集 `226` files、
    `723` functions、`0` duplicate fragments、`0` warnings；full workspace verifier
    `10/10` passed。最终 bounded review 无 Medium+ finding。
