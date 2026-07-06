# Debug Playbook

本引用用于需要 focused commands、相邻层比较、failure map 或验证矩阵时。命令块展示 command shape；实际可执行命令应来自当前仓库脚本、AGENTS 规则、构建产物或相邻测试。

## Focused Commands

优先选择最窄命令：

```bash
<test-command> -- <exact_case_name>
<lint-or-typecheck-command>
<cli-smoke-script>
<api-smoke-script>
<schema-validation-command>
```

CLI/local-tool 行为可按 operation 直接重放：

```bash
<tool> <command> <path-or-input> --output json
<tool> <command> --flag value --output readable
<input-json> | <tool> invoke
```

API/service 行为可按 request 直接重放：

```bash
<request-command> GET /resource?id=123
<request-command> POST /resource < payload.json
```

Browser/UI 行为保留最小 user path：URL、viewport、interaction、console/network/DOM evidence。

## Adjacent-Layer Comparisons

- Direct implementation 通过、CLI/API wrapper 失败：检查 routing、config/defaults、argument mapping、path resolution、output/error mapping。
- Unit 通过、integration 失败：检查 boundary mapping、environment、fixture setup、transaction、service wiring。
- Machine output 正确但 readable output 失败：按 display formatting 或 label/order/truncation 处理。
- Schema validation 失败但 implementation output 看似合理：检查 schema owner、example freshness 和 generator path。
- Browser UI state 错误但 API response 正确：检查 client state、render branch、async timing 和 accessibility/DOM state。
- External service path 失败：检查 request shape、auth/env、timeout/retry 和 response validation。

## Input Isolation

按失败类型缩小输入：

- Parser/domain：保留触发失败的最小 syntax、record、edge value、Unicode、empty/null 或 boundary condition。
- Identifier/read：保留一个 identifier、一个 lookup/read command、一个 page 和一个 limit。
- Pagination：聚焦 limit、page/cursor、continuation、truncation 和 multibyte boundary。
- Schema/output：用最小 protocol/object 对照 schema、example 或 fixture。
- Generated fixture：先运行或检查 generator path，再接受 snapshot churn。
- Windows path：保留 drive letter、backslashes、spaces、quotes 和 relative path form。
- Browser：保留 URL、viewport、interaction、console error、network response 和 DOM selector。

间歇失败要比较 OS、shell、runtime/toolchain 版本、cwd、env vars、config store、generated files、network/service state 和 test order。临时 instrumentation 放在疑似边界附近，修复后移除或转成 structured diagnostics。

## Output Replay

对 output 行为至少检查受影响 modes：

```bash
<tool> <command> <input> --output json
<tool> <command> <input> --output readable
<tool> <command> <input> --output compact
```

实际 mode 名称来自当前项目，不要把示例名称当作要求。

## Workspace Verification Triggers

触碰这些边界后运行 repository workspace verifier，或记录跳过原因：

- Multiple packages/crates/modules。
- CLI/API behavior plus implementation boundary。
- Schemas、examples、generated fixtures。
- Docs 中公开的 command/API behavior。
- Browser E2E critical path 或 release/package artifact。
