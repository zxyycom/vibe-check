## 1. 实现前审计

- [x] 1.1 审计 proposal、design、六个 capability deltas 和本 tasks：确认它们都以现有完整 TS 实现的产品化为唯一主线，且源码所有权、固定检测栈、正式入口、capability ownership、实现顺序和验收证据一致；`design.md` 无未回答开放问题；当前 change 仍只修改 `openspec/changes/productize-typescript-quality-tooling/**`。
- [x] 1.2 确认实施 gates：第 2 节固定源码 closure、现有行为回归、固定组件和 owner contract 基线；第 3–5 节完成源码收归与固定检测栈产品化；第 6 节提供当前开发环境的本地验收证据；第 7–8 节在全部证据通过后同步 owners、切换默认入口并完成最终验证。

## 2. 产品化回归与依赖基线

- [ ] 2.1 固定 `quality-core`、foundation 和 parallel-task-runner 当前 gitlink revisions，记录来源、许可证、submodule worktree 状态与未推送修改保护方式；不得覆盖用户已有 worktree。
- [ ] 2.2 建立 product runtime import inventory，逐项区分 product core、runtime helper closure 和 development-only validators/verifier，并证明 inventory 覆盖全部 production imports。
- [ ] 2.3 建立产品化前回归基线，覆盖 scan planning、code areas、baseline/cache、scc/Lizard/jscpd parsing、metrics/aggregation、warning channels、accepted-warning handling、gate、console status 和 report/raw artifacts，并保存可重放输入与期望结果。
- [ ] 2.4 对照 CLI、output、exit-code、scan-scope、schema 和 examples owners，标出正式 entry/projection 必须保持的 contract 与对应 product-core 行为。
- [ ] 2.5 固定 scc、jscpd、Lizard/Python 和 Bun 的 version、source、license、invocation protocol、resolution strategy、现有 typed tools config 与 availability checks，并记录影响 normalized results 的参数。

## 3. Vibe Check-owned Product Source

- [ ] 3.1 建立正式 TS/Bun local CLI、product core、domain model、scanner adapters、toolchain config 与验证入口的模块边界，并写出 production import constraints。
- [ ] 3.2 按固定 revision 迁入 `quality-core` source，并以第 2.3 节回归基线证明源码所有权变化保持完整行为。
- [ ] 3.3 只迁入 inventory 证明为 product runtime 所需的 foundation / task-runner helpers，保留来源、许可证和局部 API provenance。
- [ ] 3.4 把 production imports 切换到 Vibe Check-owned modules，并用 dependency/import audit 证明 product source 不导入 `scripts/tools/*` gitlinks、workspace verifier 或 docs validators。
- [ ] 3.5 将 `scripts/quality/**` dogfooding entry 改为消费正式 product API/CLI；仓库专用 include/exclude、code areas、thresholds 和 accepted warnings 留在 typed consumer config。
- [ ] 3.6 仅在 gitlink 已无剩余消费者时删除对应 `.gitmodules` entry、gitlink、初始化文档和 package scripts；仍服务开发工具的 submodule 明确记录 owner 与消费边界。
- [ ] 3.7 运行迁入后 typecheck、lint、unit tests 和回归 suite，逐项核对第 2.3 节证据并修复未解释差异。

## 4. TS/Bun Product Control Plane

- [ ] 4.1 实现正式 TS/Bun invocation，保持 `vibe-check scan [project-root]`、`--format human|json`、`--config`、help/version、path normalization 与 CLI owner contract，并把请求直接接入迁入后的 product core。
- [ ] 4.2 让 normalized scan scope 成为 scc、Lizard/Python 和 jscpd adapters 的唯一 input owner，证明 output mode、cwd 和 component path 不改变 supported/excluded file set。
- [ ] 4.3 建立 typed product config boundary；通用 defaults 与 Vibe Check dogfooding config 分离，并覆盖 code areas、baseline/cache、thresholds、accepted warnings、artifact/cache path 和 scanner fixed args 的 validation/identity。
- [ ] 4.4 由 TS product core 继续生成 metrics、warning channels、accepted-warning state、gate 和 report data；在 projection layer 完成 owner-defined rule IDs、JSON schema/examples、human output、stdout/stderr 和 exit-code mapping，不把 component-native identity 暴露为 product policy。
- [ ] 4.5 定义 scc、Lizard/Python 与 jscpd 的 product-owned normalized result、diagnostic 与 failure types，并让 typed tool config 为每项 capability 只映射唯一固定 component。
- [ ] 4.6 将 component version、影响结果的固定参数、parser/normalization 和 config 接入 cache/baseline identity，并覆盖兼容复用与不兼容重新扫描。
- [ ] 4.7 为三个 process components 实现 tool-config-resolved command、structured args、explicit cwd、timeout、bounded stdout/stderr 与 no-shell invocation，并使用 platform-neutral runtime APIs。
- [ ] 4.8 映射 component missing/wrong-version、spawn、timeout、protocol、file-level partial 与 normalization failures，证明失败不表现为 zero metrics、zero duplicates 或 clean scan。

## 5. 固定检测栈产品化

- [ ] 5.1 将现有 scc wrapper 迁入正式 LOC adapter，固定 version、`--by-file --format csv` protocol、file/language normalization、ordering、raw artifact 和 diagnostics，并通过产品化回归 suite。
- [ ] 5.2 将现有 jscpd wrapper、code-area task planning、parallel execution、cache、JSON parsing、fragment normalization 和 raw artifact 迁入正式 duplicate adapter；固定 product default 与 dogfooding threshold config 的 identity。
- [ ] 5.3 将 jscpd resolution 接入 repo-owned typed tools config 与 availability checks，证明执行不读取目标项目 `node_modules` 或 package metadata，并覆盖 valid empty report、missing report、invalid JSON、timeout 和 process failure。
- [ ] 5.4 将现有 Lizard wrapper、CSV parser、function normalization、ordering 和 raw artifact 迁入正式 function-metrics adapter，固定 Python/Lizard versions 与 invocation protocol。
- [ ] 5.5 将 Python/Lizard resolution 接入 repo-owned typed tools config 与 availability checks，覆盖 missing executable、wrong version、explicit path、cwd 和 temporary directory boundaries。
- [ ] 5.6 在 TypeScript、Go、Rust 和 Python checked-in fixtures 上完成 Lizard product normalization，覆盖 supported/excluded forms、stable name/kind/range、NLOC、cyclomatic complexity、receiver/compound parameter semantics、ordering、file-level partial 和 fatal protocol behavior。
- [ ] 5.7 为 scc、jscpd 与 Lizard/Python 建立 checked-in productization/conformance suites；同一 fixed version、config、inputs 和 protocol 在基线实现、迁入后 source entry 与当前开发环境 local CLI 中产生相同 normalized results、diagnostics 和 artifact boundaries。

## 6. 产品验证

- [ ] 6.1 建立正式 local product command 与 repo-owned dependency check，验证 Bun、scc、Lizard/Python、jscpd、typed config 和 writable paths 已满足执行条件。
- [ ] 6.2 在当前开发环境通过正式 entry 对代表性 checked-in project inputs 运行真实 human 与 JSON scans，并保存回归、owner-contract、diagnostic 和 artifact evidence。
- [ ] 6.3 从不同 cwd 扫描外部 project roots，验证 project input、repository config 与 cache/artifact/baseline/temporary state 的 typed boundaries。
- [ ] 6.4 为 path normalization 与 process invocation 建立 lexical tests，覆盖 POSIX/Windows path values、spaces、Unicode、quotes、relative path、structured args 和 executable naming；validation scripts 使用 platform-neutral runtime APIs。
- [ ] 6.5 验证 dependency missing/wrong-version、spawn failure、timeout、invalid protocol、project-root 外 path 和 normalization invariant failure 产生可行动 diagnostics，且不产生虚假成功 report。
- [ ] 6.6 运行完整产品化回归、固定组件 conformance 和 CLI/output/scan-scope/schema owner contract suites，并修复未解释差异。

## 7. Owner 同步与仓库默认入口切换

- [ ] 7.1 更新 `AGENTS.md`、architecture、navigation 和 coding-style owners，使现有 TS quality engine、模块化单体与 scc/Lizard/Python/jscpd 固定检测栈成为唯一长期产品架构。
- [ ] 7.2 更新 script-tooling owner，区分 Vibe Check-owned product source、dogfooding consumer、development-only submodules、typed config 和验证命令。
- [ ] 7.3 更新 scanner-dependencies、quality-metrics、structural-scanning 与 duplicate-scanning owners，记录固定 component、dependency resolution、normalization、result-affecting identity、state compatibility 和 failure mapping。
- [ ] 7.4 同步 CLI、output、scan-scope、schema 和 examples owners，记录 TS/Bun product entry 与 product-core projection；任何 stable shape/meaning change 必须在对应 delta 和 schema version 中明确。
- [ ] 7.5 更新 testing strategy、fixture maintenance、case ledger 与 `@case` markers，使产品化回归、fixed-component protocol、local acceptance 和 owner contract proof targets 可追溯。
- [ ] 7.6 更新 product setup、dependency checks、runtime provenance 与 local validation instructions，使正式产品入口和运行条件可直接发现。
- [ ] 7.7 在 source ownership、回归、固定依赖、owner contracts 与本地执行证据全部通过后，将仓库默认 product entry、dogfooding 与 validation commands 切换到 TS/Bun product core。

## 8. 最终验证

- [ ] 8.1 运行 product core unit/integration/regression tests、TypeScript typecheck、lint、import-boundary audit 和全部 fixed-component fixture suites。
- [ ] 8.2 运行当前开发环境 local acceptance、dependency failures、project/config/state isolation 和 path/process lexical boundary checks，并保存验证证据。
- [ ] 8.3 运行受影响 docs、schema、examples、OpenSpec、case ledger 和 whitespace validation，以及 `bun run verify:vibe-check-workspace:required`。
- [ ] 8.4 运行 `openspec validate "productize-typescript-quality-tooling" --type change --json --strict --no-interactive`、`git diff --check`、局部 diff、capability audit、gitlink audit 和 production import audit，确认只包含经审计范围并记录无法执行的验证与残余风险。
