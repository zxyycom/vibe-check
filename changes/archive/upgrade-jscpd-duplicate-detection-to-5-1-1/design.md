# Design

以 package/engine 一致性、双版本 scanner differential 和 installed consumer evidence 完成 5.1.1 baseline upgrade；
把 clone baseline 限定为 Change-owned experiment，使依赖升级不会偷渡新的 Git/reference 或 finding policy。

## Context

`duplicateDetection` 当前将 package-provided jscpd 解析为 active Bun 启动的 package-local bin，也允许 consumer 选择一个
直接接受 jscpd CLI arguments 的 custom executable。adapter 独占 version probe、project-external temporary config、
absolute exact path list、JSON output、threshold 下界和 automatic worker policy；normalized fragments 在 conversion 前通过
exact-scope reconciliation，实际 tool version 进入 Check-local raw cache identity。

版本政策刻意分成两层：repository 以 exact dependency/lockfile 建立可重复测试 baseline，发布 candidate 用同 major range
允许兼容升级。5.1.0 已证明 manifest semver 不等于实际 engine；因此本 Change 把 engine execution 证据提升为 release
acceptance 条件，并把新的 lower bound 直接放到已修复版本 5.1.1。

仓库历史上曾有 manual duplicate baseline：分别扫描 reference/current，以排序后的 `path:startLine` locations 计数并计算
duplicate delta；它在 comparison/reference runtime hard cut 时被删除。jscpd 5.1.1 的 checked-in baseline 与 JSON `isNew`
提供了重新评估机会，但 upstream identity 和历史算法都可能对插行、rename、line ending、版本变化敏感，不能未经证据直接
替换当前 product settlement。

## Goals / Non-Goals

目标：

- 让 repository 和发布 consumer 从 5.1.1 起使用已修复 wrapper，并证明声明、bin 与 actual engine 一致。
- 保持现有 v5 adapter/public/cache/scoping contract，同时验证 5.1.1 的 additive output 和 platform package matrix。
- 用固定 corpus 判断 scanner findings 是否有版本漂移，并让每项差异可追溯。
- 独立评估 upstream clone baseline 是否比历史 manual algorithm 更适合未来的“只阻止新增重复”。

非目标：

- 不在本 Change 中改变 duplicate finding settlement、Records、area thresholds 或 findingPolicy。
- 不在 production 使用 `--fail-on-new-clones`、`--baseline-from-ref`、temporary worktree 或 Git reference scan。
- 不把 baseline/config/args/workers/version range 暴露给 consumer，不添加新 reporter 或通用 scanner API。
- 不承诺 current host 之外 optional packages 的真实运行；静态证据必须与 runtime evidence 分开陈述。

## Decisions

### Intended Change

#### 1. Baseline and compatibility lower bound

- root development dependency 精确设为 `5.1.1`，pnpm lock 必须解析 `jscpd@5.1.1` 和该版本声明的 optional native
  packages，不允许残留 package wrapper 5.0.11/5.1.0 节点成为默认 runtime path。
- `JSCPD_VERSION_RANGE` 与 generated candidate manifest 更新为 `^5.1.1`。这保留 active Decision 的 same-major v5
  provenance policy，同时排除 broken 5.1.0 和更旧 engine。
- custom executable 的 availability 不改成 exact 5.1.1 gate：任何可识别 actual version 仍进入 cache identity 与诊断。
  package range 和 custom command 是不同 ownership，不互相推断。

#### 2. Manifest/bin/engine consistency

- repository、candidate install 和 external consumer 分别读取 resolved manifest version、验证 `bin.jscpd` target 未逃出
  package directory，并真实启动该 target 取得 `cpd` 或 `jscpd --version`。
- acceptance 要求三者都指向 5.1.1。若 manifest 是 5.1.1 而 engine 不是 5.1.1，按 dependency/package evidence failure
  处理，不用 compatible version parser 掩盖 wrapper skew。
- 建立七项 optional package matrix，核对 package name、5.1.1 version、platform/architecture selection 与 binary target。
  当前 host 执行 package scanner；其它 OS/arch 使用 manifest、lock、package metadata 和既有 resolution tests，并标注未运行。

#### 3. Scanner differential and strict adapter boundary

- checked-in corpus 至少覆盖 Markdown prose/fenced code、TypeScript duplicates、multi-root、cross-area fragments、CRLF/LF、
  special paths、empty/no-clone、malformed/missing JSON 和 out-of-scope report locations。
- 对相同 private config 与 exact paths 分别执行 5.0.11/5.1.1，比较 actual version、exit、report location、required JSON
  fields、additive `isNew`、normalized fragments、Records、finding counts 与 status。
- adapter 继续写 project root 外的临时 config，config 内只含 approved absolute paths、json reporter、line/token minima、
  absolute/silent/noTips；不接受 `.config` auto-discovery，也不把 baseline 写进 production config。
- parser 可忽略已证明安全的 additive `isNew`，但继续要求形成完整 trusted fragment 的字段。任何 partial/malformed/out-of-set
  batch 都拒绝，不以“新版本输出”作为放宽理由。
- actual 5.1.1 version 已自然使旧 cache miss；只有 config/report normalization semantics 实际变化时才 bump 当前 raw-scan
  configuration version，否则保留它并用 cache tests 证明 version identity 足够。

#### 4. Bounded clone-baseline evaluation

- 实施任务 1.1 创建 `baseline-evaluation.md`，记录 5.1.1 checked-in baseline 的生成输入、baseline artifact identity、JSON
  `isNew` observation、命令和结论；artifact 是本 Change 的 evidence，不是 current product owner。
- 用同一 fixture ledger 重建历史 manual algorithm 的关键义务：reference/current 各自 scan，以排序后的
  `path:startLine` location key 匹配，并与 upstream `isNew` 比较。历史实现只作为 comparison oracle，不恢复为 runtime。
- corpus 必含 line insertion、CRLF/LF、file rename/move、clone content edit、相同 clone 多次出现、跨 area threshold、
  baseline/scanner version change 和 baseline 缺失/损坏。每项记录 existing/new classification、false positive/negative 风险
  及对 exact scope 的影响。
- 不在 production 传 `--fail-on-new-clones`：当前 adapter 将 non-zero exit 归为 execution failure/unavailable，会丢失“有
  findings 但执行可信”的产品语义。
- 第一轮不采用 `--baseline-from-ref`：它引入 temporary worktree/reference scan、Git resource ownership 和 exact-input
  reconstruction，超出 dependency upgrade。若 checked-in baseline evidence 充分，再由独立 Decision/Change 选择 baseline
  producer、更新时机和 review policy。

#### 5. Future decision boundary

- baseline evaluation 只能产出建议。若建议采用，后续 Decision 必须定义 existing clones 是否仍发布 Records、只有 new
  clones 是否进入 current findingPolicy、baseline 如何 review/update、scanner version 如何使 baseline stale，以及 rename/
  line-ending/Git failure 如何结算。
- 在该后续决策生效前，5.1.1 的所有 trusted fragments 与 5.0.11 一样进入当前 area threshold 与 finding settlement；
  `isNew` 不进入 public facts、cache schema 或 Record IDs。
- 实施时只演进 active provenance Decision 的 current repository baseline/range 和新增 engine-skew evidence，不提前把实验
  写成已采用能力。

### Resulting Impacts

- package consumers 的最低可解析 jscpd 从 5.0.11 变为 5.1.1；这是为排除已知 broken wrapper 作出的有意 packaging
  compatibility change。
- repository lock 和 external consumer 会获取新的 native optional package matrix；安装风险通过 candidate resolution 与
  platform evidence 暴露，而不是在 runtime fallback 到旧 binary。
- 5.1.1 JSON 中的 additive baseline metadata 不改变当前 normalized model；未来采用 baseline 时需要独立 cache、Record 和
  migration design。
- Change 交付时可能得到“不建议采用 upstream baseline”的有效结论；只要 evidence 覆盖既定 corpus，这不阻塞 5.1.1
  dependency upgrade。

## Risks / Trade-offs

- same-major range 仍可能让未来 v5 改变 heuristic findings；actual version cache partition、installed consumer Run 和
  fail-closed parser 限制技术风险，finding 演进继续由 active provenance policy 接受。
- 当前 host 无法真实证明全部 platform binaries；静态 matrix 可提前发现缺包/错 mapping，但不能替代目标平台 smoke test。
  发布材料必须明确这项剩余边界。
- upstream baseline 可能依赖 path/line identity，与已删除 manual algorithm 共享脆弱性。单独评估避免把“官方支持”误当成
  “符合 Product 语义”。
- 同时做 upgrade 与 baseline evaluation 增加 evidence 量；通过禁止 production baseline flags 和独立 artifact 将风险隔离，
  不让实验阻塞纯版本 hard cut 之外的代码。

## Open Questions

- 5.1.1 package 的七项 optional matrix 在 candidate 支持的各 OS/arch 上是否都能解析到正确 executable？
- 5.1.1 相比 5.0.11 是否改变 Markdown、path normalization 或 normalized fragment identity？
- upstream checked-in baseline 在 insertion、rename、line ending 和 repeated clone 场景中，是否比历史
  `path:startLine` algorithm 更稳定且可 review？
- 若未来只阻止新增重复，baseline artifact 应由 repository commit、Project Definition 还是另一个生成 owner 持有？

前三项由本 Change evidence 回答；最后一项只进入后续 Decision，不在本 Change 选择。

## Resume Conditions

- 开始实现前重新确认 npm/GitHub official release 中 5.1.1 的 manifest、engine fix、optional package matrix、baseline flags
  和 JSON behavior；若 latest stable 已变化，仍以本 Change 明确目标 5.1.1 建 baseline，除非先更新 Proposal。
- 取得实施授权，并在当前 HEAD 重读 duplicate-detection、package/candidate、scanner dependency、version Decision 与 Test
  Evidence owners。
- 准备可隔离执行 5.0.11 和 5.1.1 的 environment、representative corpus 与 installed candidate consumer；若不能取得
  actual 5.1.1 engine evidence，不得仅凭 lockfile 完成 upgrade。
- 若实现需要 public baseline option、Git worktree/reference owner、Record schema 或 findingPolicy 变化，停止本 Change 的
  capability 扩张并建立独立 Decision/Change。
