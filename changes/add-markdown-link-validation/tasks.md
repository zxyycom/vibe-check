# Tasks

任务先关闭 Link 独立性、target semantics、parser/dialect/data-contract 的证据门，再实现零网络本地引用完整性，并在同一 Change 闭合 public/package evidence。当前唯一可执行入口是 0.4。

## Readiness

- [x] 0.1 已按当前 ordinary Check/options/dependency/Core contract 重建范围，并删除当前 Product 无法安全承接的 external snapshot/handoff。
- [x] 0.2 已固定 offline occurrence owner、zero-network、safe issue model与 Path/Network边界；Link 不以 Structure Check runtime result或 private handoff为前提。source exact scope 与 Check-owned direct local target resolution 保持不同职责。
- [x] 0.3 已在修改测试前运行 `bun run test-evidence -- check --root .`；仓库外、忽略 install scripts 的 Bun fixture 已审计 mdast/micromark + slugger 候选的 compatibility/license/grammar/range/anchor，及 URL spelling、Windows/POSIX、local-or-remote `file:`、root 外 mode、directory、symlink 与 direct-only no-recursion。详细 selection matrix 见 `docs/investigations/implementation-libraries/markdown-link-validation-library-strategy.md`，当前 contract/evidence 见 Design；未安装 Product dependency。
- [ ] 0.4 关闭 Design L3–L5 并把实际选择写回 proposal/design/tasks：先交付 local/remote path-form 的 lexical classification、I/O sequencing、mode verdict 与 safe reason table；再固定 direct package names/semver、最小 extensions、defined/undefined reference、decoded range 与 GitHub-priority fixture corpus；最后固定 option field names/defaults、safe DTO/reasons/counts/limits。未关闭的 public、安全或 dependency evidence 不进入 Implementation。

## Implementation

- [ ] 1.1 在 L4 关闭后，新增 occurrence/reference/anchor/source-range fixtures，并实现 Link-owned bounded `bytes -> normalized Markdown link facts` private adapter；封装 dependency AST，不建立 Structure dependency、cross-Check handoff、cache或 public Markdown model。
- [ ] 1.2 在 L3/L5 关闭后，实现 controlled decode/classification、source-vs-target gate、root 外 `ignore/report/validate`、lexical/realpath handling、directory/file/non-empty semantics、eligible cross-document anchor read、Product slug lookup、safe normalized issues与 resource handling；不做 recursive target scan。
- [ ] 1.3 新增 `markdownLinkValidation` value、closed options/runtime validation、global source filtering、Records、final counts与 four-state result；HTTP(S)/UNC/remote `file:` form 保证 zero Product-owned network and zero persistent request material，root 外 local target只在 explicit `validate` mode 读取。
- [ ] 1.4 同步 public exports/contract、Configuration/Scan Scope/Quality/Output、README/JSDoc/examples、production dependency/license、semantic Cases 和 isolated installed-Bun consumer；不修改 repository docs validator或 Network Link Check。

## Verification

- [ ] 2.1 运行 occurrence/reference/image/autolink/encoding/front-matter/GitHub-priority slug/path/directory/non-empty/anchor/options/source-scope/root-external mode/local-or-remote `file:`/UNC/symlink/no-recursion/limits/failure/zero-network/credential-canary 最窄 tests，并在测试改变前后完成 Test Evidence closure。
- [ ] 2.2 运行 product typecheck、lint、目标 tests、docs/package candidate、dependency/license audit与 installed Bun acceptance。
- [ ] 2.3 运行 required/full Gate；复核没有 DNS/HTTP、UNC/remote `file:` access、external material、scripts import、second target discovery、Structure dependency、implicit root 外 read、raw URL/path persistence或未声明 public surface。
