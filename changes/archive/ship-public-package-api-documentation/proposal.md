# Proposal

本 Change 让首次公开 package candidate 同时交付可在编辑器中读取的中文 API 说明和可在安装目录中读取的中文使用指南，并让其中需要 typecheck 或运行证明的 TypeScript 示例先成为代码，再确定性投影到 JSDoc、README 或两者。

## Why

当前 package candidate 已提供受控的 runtime entry 和 TypeScript declarations，但 tarball 不包含 `README.md`，多数 public declarations 也缺少足以支持编辑器 hover 的说明。只拿到安装产物的 Bun consumer 无法从 package 自身可靠恢复安装与支持边界，也难以正确使用 Project Definition、Checks、Records、typed dependency data、Run Controls、effects 和 `RunResult`。

仓库中的 [`docs/configuration.md`](../../docs/configuration.md) 与 [`docs/output.md`](../../docs/output.md) 已拥有稳定语义，但它们是仓库 owner 文档，不是随 package version 交付的 consumer 文档。若到 publish 阶段才临时补文档，JSDoc、README、示例与实际 tarball 就无法共同经历 declaration emit、candidate audit、isolated install 和真实消费验证。

公共 symbol inventory、行为语义和 candidate 入口现已足以作为文档输入。因此当前应先实施 `ship-public-package-api-documentation`，再让 [`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/) 验证同一个 documentation-complete artifact；[`publish-public-api-only-npm-package`](../publish-public-api-only-npm-package/) 仍需后续单独授权。

## Outcome

完成后，current public API 及正确使用它所必需的 supporting declarations 会在 source 与 emitted declarations 中保留中文 JSDoc；package root 会包含从中文 template 生成的 `README.md`。所有声称经过 typecheck 或 runtime 验证的 TypeScript 代码块都以 `docs/examples/package-api/*.ts` 为唯一代码源，再由 `scripts/docs/package-api-docs/registry.ts` 按实际消费需要投影到指定的 JSDoc `@example`、README placeholder 或两者。Candidate preparation 会检查这些投影没有漂移，将 README 与 declarations 一起打包，并以 isolated Bun consumer 证明文档、示例和 public API 属于同一个 exact artifact。

## Scope

### Intended Change

- 依据 [`src/product/public-contract/current.ts`](../../src/product/public-contract/current.ts) 的 exact inventory，在实际 declaration owners 上补充中文 JSDoc；只使用能改善当前消费体验且已经验证的 tag，不改变 public exports 或运行语义。
- 新建中文 README template、可验证的 TypeScript example sources 和 typed closed projection registry；JSDoc 与 README 可以共享同一代码 source/region，但分别选择目标，不要求任一 JSDoc example 同时进入 README。
- 新建一个可导入的 documentation operation 和薄 CLI adapter：operation 生成预期投影，CLI 提供 `--write` / `--check`；candidate 在进程内直接调用 operation，不启动 CLI 子进程。
- 将 generated root `README.md` 与带注释的 declarations 纳入 candidate fingerprint、staging、tar inventory、byte audit、receipt reuse 和 isolated-consumer acceptance。
- 维护受影响的测试、Case、文档导航与脚本说明，并写出绑定 exact artifact 的 documentation handoff。

### Resulting Impacts

- JSDoc prose、README template、example source/region、projection registry、documentation operation 或 declaration source 的变化都会改变文档输入；相关 checked-in projection、candidate receipt 与 handoff 必须重新生成和验证。
- Candidate 的允许文件与预期 tar inventory 从 runtime/declarations 扩展为同时要求 `README.md`，因此 tarball digest 会变化。
- `README.md` 和 JSDoc 中生成的 `@example` block 是消费投影，不是新的语义或代码 owner；冲突时修正 stable owner、JSDoc prose owner、README template 或 example source，再重新生成。
- 下游 Gate optimization 与 publish 只能消费 matching documentation handoff 和 candidate identity。
- 本 Change 不查询 npm registry、不访问 credential、不选择公开版本，也不执行 publish。

## Success Criteria

1. `CURRENT_PUBLIC_CONTRACT` 中每个 runtime operation、runtime value 和 named type，以及正确使用这些 roots 所必需的 supporting declarations，都在 emitted declarations 中保留可行动的中文 JSDoc；coverage 由 exact inventory 推导，不维护第二份 symbol list。
2. 生成的 package-root `README.md` 让只获得安装产物的 Bun consumer 能判断当前可用性与支持边界，并完成最小 Project Definition/Run、default 与 custom Check、Records、typed dependency data、controls/effects 和 `RunResult` 处理。
3. 每个需要执行、typecheck 或 runtime 证明的 fenced code block 都先有 allowlisted code source 与 evidence；首版 executable blocks 仅使用 `.ts` source 或命名 region。Typed registry 显式记录 evidence mode 和 JSDoc/README typed target，`--check` 能拒绝缺失、重复、未知、未消费或过期投影。
4. JSDoc tag 使用符合本 Change 的 closed policy；declaration emit 与 language-service fixture 证明实际使用的 tag 被保留且可读，不为“格式完整”添加无语义 tag。
5. Candidate tarball 与 isolated installation 都包含和 documentation operation 输出一致的 `README.md`、最新 declaration comments 与可验证 examples；任一文档输入变化会拒绝旧 receipt。
6. Configuration、Output、public inventory、declaration sources、guide、examples、tests 与 Case 账本保持单向 owner 关系，不形成相互冲突的第二契约；`src/product/README.md` 仍只保存 initial-lift provenance。
7. `package-api-documentation-handoff.md` 记录 source revision、文档输入与投影、public inventory、candidate fingerprint/version/path/digest、tar/installed bytes、declaration coverage、consumer 证据、验证命令和失效条件。
8. 目标测试、test-evidence closure、文档与 Change 检查、受影响的 format/typecheck/lint 以及 required Project Gate 全部通过。

## Affected Owners

- Public inventory 与 declaration sources：`src/product/public-contract/current.ts`、`src/product/definition/**`、`src/product/run/**`。
- 稳定 authoring/result 语义：`docs/configuration.md`、`docs/output.md`。
- 文档输入与消费投影：`docs/package-readme.template.md`、`docs/examples/package-api/**`、`scripts/docs/package-api-docs/{registry,render,index}.ts`、source JSDoc、root `README.md`、`docs/navigation.md`。
- Candidate 与 exact-artifact 证据：`scripts/package-candidate/**`、`docs/script-tooling.md`。
- 测试与语义证据：相邻 Bun tests、`docs/testing/cases/**`、test-evidence tooling。
- 下游交接：`changes/ship-public-package-api-documentation/package-api-documentation-handoff.md`。
