# Proposal

本 Plan 定义首版普通 default Check `markdownStructureValidation` 的实现与验收边界；它是未来公开 package 的目标，不证明当前 package 已经提供该能力。

## Why

项目中的 Markdown 文档需要低噪声且可重复的标题结构反馈：缺少或重复 H1、首个标题不是 H1、标题层级向下跳跃，以及显式限制的标题深度都会妨碍文档导航和维护。首版只解决这些可由解析结果确定的问题，不把主观 prose 度量、格式化或通用 lint 伪装成同一能力。

## Outcome

完成后，package 公开 ordinary Check value `markdownStructureValidation`（`checkId = "markdown-structure-validation"`）。该 Check 只读取 global scope 内获得资格的 `.md` 与 `.markdown` exact inputs，以 package-private Markdown parser boundary 生成标题事实，按其 closed options 验证标题规则，并以 safe Check-local Records、final counts 和四态 Check result 表达本次结论。

## Scope

### Intended Change

1. 新增 closed `MarkdownStructureValidationOptions`。其完整 grammar 只含 `requireSingleH1`、`requireFirstHeadingH1`、`forbidDepthSkips` 与 `maximumDepth`（`false | 1..6`）；它不重新发现文件、不扩大 global scope，也不提供 per-file override。
2. 选择并封装一个受审计的 CommonMark + GFM parser dependency。adapter 不公开 dependency AST、parser provider 或 parser identity；它只向 package 内部暴露当前已确认的 normalized document facts 和 source ranges。首版共享 boundary 的确切 v1 facts 由设计问题 D3 定稿，不把尚无消费者的事实默认固化为长期契约。
3. Structure Check 只报告 heading-rule violations。正常完成时，issues 大于零为 `failed`、零为 `passed`；没有 eligible Markdown input 为 `not-applicable`；read、decode、parse、resource-limit、cancellation 或 Product-protocol failure 为 `unavailable`，且不伪造通过结论。
4. 同步 public value、options runtime validation、exports、README/API example、JSDoc、dependency/license evidence、stable owner docs、semantic Cases、Project Gate evidence 与 isolated installed-Bun candidate。
5. 不实现 paragraph/section word 或 character measurement、style/formatting、自动修复、完整 lint 规则集、链接/path/network 语义、HTML 安全、shared file policy、comparison/reference、cache 或任何 cross-Check runtime handoff。

### Resulting Impacts

- `add-markdown-link-validation` 可以复用同一 package-private parser module，但只能依赖已确认的 document facts；它不是 Structure Check 的 runtime dependency，不能读取 Structure 的 final data、Records 或执行结果。Link 所需但 Structure 不需要的 facts 由 Link Change 在有实际消费者时扩展并验证。
- 新 default Check 会扩展当前 Configuration、Scan Scope、Quality Metrics、Output、public package 和 Case owner 的已实现事实；这些 owner、源码和证据必须在本 Change 完成时同步，Change artifacts 不能替代它们。
- parser dependency、dialect fixture corpus 与 source-range contract 是共同实现风险。任何随后扩大 private parser boundary 的改动都必须同时复核 Structure 和 Link 的共同 fixtures，但不因此建立 public shared parser contract。

## Success Criteria

- 对确认的 Markdown dialect，front matter、ATX/Setext headings、code fence、HTML、tables、lists、Unicode、空文档和 malformed/undecodable input 的 heading facts或受控 unavailable 结果都有 fixture 固定的行为；代码中的 `#` 绝不被当作 heading。
- 四项规则可单独启用或关闭并可组合；其 default values、空文档行为、depth-skip grammar 和 `maximumDepth` 边界均有 public-facing evidence。
- 每个 violation Record 具有 Check-local、安全且与当前位置解耦的稳定 identity；source range 只用于导航。Record/final data 形状、计数口径和 unavailable reason 的完整 contract 有测试、文档与 machine-safe projection evidence。
- Check 只消费 global scope 中 `.md` / `.markdown` 的 exact paths；没有第二个 file collector、scope expansion、per-file override、parser-result cache 或跨 Check result handoff。
- 最窄行为测试、Test Evidence closure、typecheck、lint、package/candidate acceptance、required/full Gate 全部通过，且 public surface、runtime dependency 与 license materials 完整一致。

## Affected Owners

| Owner | 本 Change 必须同步的事实或证据 |
| --- | --- |
| `docs/configuration.md`、`src/definition/default-checks.ts` | default value、完整 closed options、native composition 与 runtime validation。 |
| `docs/scan-scope.md`、Check input implementation | global-scope exact-input eligibility、`.md` / `.markdown` filtering 与 no-expansion boundary。 |
| `docs/quality-metrics.md`、`src/checks/builtins/**` | heading violations、Record identity、final counts、四态 settlement 与 resource failure。 |
| `docs/output.md`、machine/output tests | Record/final data 的 canonical-JSON 安全边界与公开投影。 |
| `src/index.ts`、package/dependency/license owners、README/JSDoc/examples | public export、dependency material、可验证 consumer example 与 installed candidate。 |
| `docs/testing/cases/**`、相邻 Bun tests | dialect、rule/options、scope、failure、public-consumer 及 Structure/Link shared-fixture 证据。 |
