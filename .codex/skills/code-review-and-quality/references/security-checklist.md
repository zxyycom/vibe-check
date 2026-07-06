# 安全清单（Security Checklist）

这是 code review 时使用的 security quick reference。需要深入 threat model 或改动本身以 hardening 为主时，优先使用当前项目已有 security/hardening 指南；没有 owner 文档时，用本清单作为最小审查框架。

重点是 local tool、CLI/API、service、browser 和 automation 的 trust boundaries：untrusted input、filesystem path、process execution、stdio/JSON、schema validation、generated output、browser/tool output、external command、dependency 与 secret handling。

## 威胁建模（Threat Modeling）

- [ ] 已标出 touched boundary：parser/input validation、identifier generation/parsing、path resolution、process invocation、stdio JSON、API request/response、browser output、schema validation、generated docs/examples、dependency script 或 external command。
- [ ] 已命名要保护的 asset：workspace containment、local files、user data、service credentials、protocol stability、schema trust、secret、CI trust、developer machine safety 或 production environment。
- [ ] 至少写出一个 abuse case：traversal、forged/overlong identifier、malformed Unicode、oversized input、malformed JSON、stdout pollution、output confusion、prompt injection in docs/tool output、shell argument injection、schema bypass、XSS/HTML injection 或 secret leakage。
- [ ] Control 放在第一个理解数据的 code boundary，而不是放在 prompt、注释或调用方约定里。

## 输入、Identifiers 与路径（Inputs / Paths）

- [ ] Document text、user input、API responses、browser/DOM/console/network output、logs、generated text、tool output 与 model output 都按 untrusted data 处理。
- [ ] Identifier/ref/token 在 owning layer 外保持 opaque；非 owner 不解析、不改写、不拼装。
- [ ] Identifier validation 覆盖 malformed、overlong、unsupported、wrong-scope 与 cross-resource reuse。
- [ ] Path 在访问前 canonicalize，并按 workspace/root policy 检查 traversal、symlink escape、absolute path surprise 与 input-derived executable path。
- [ ] Large input、deep nesting、recursive traversal、pagination 和 batch size 有明确 size/time/depth limits。

## 进程、命令与服务（Processes / Commands / Services）

- [ ] Process spawning 使用固定 executable 与 structured argv；没有 shell interpolation 或 string-built command。
- [ ] cwd/env 显式且最小化；secret 不被无意传给 subprocess、adapter、test job 或 external command。
- [ ] stdout、stderr、exit status、timeout 与 output-size caps 被确定性处理。
- [ ] External service failure 不会被包装成成功 result。
- [ ] 触及 generated artifacts、CI scripts、dependency install scripts 或 deployment automation 时，按 executable attack surface 审查。

## Protocol、Schema、HTML 与输出（Output）

- [ ] Structured JSON 只解析一次，并拒绝 malformed envelope、partial data、wrong content type 与 trailing data。
- [ ] Machine output、readable output、HTML/Markdown、logs 和 examples 没有混用 schema、wrapper、escaping 或稳定性承诺。
- [ ] CLI input、API response、examples、fixtures 与 generated material 都按对应 schema 或 contract 验证。
- [ ] Hostile source text 在进入 Markdown、terminal output、JSON fields、paths、commands、HTML 或 browser-rendered content 前已 escape 或结构化。
- [ ] Error message/log 可诊断，但不泄露 secret、credential、sensitive absolute path、stack trace 或大段 raw user data。

## 依赖与供应链（Dependency / Supply Chain）

- [ ] 新 dependency 有明确必要性，且检查 maintenance、provenance、install scripts、typosquats、license 与 lockfile impact。
- [ ] Dependency checks 只在 dependency risk 或 lockfile/package files touched 时运行，并按 reachability 与 shipped exposure triage。
- [ ] Generated files、examples 与 fixtures 没有携带 secret、host-specific absolute path 或可执行 payload。

## 审查升级（Review Escalation）

- [ ] 如果 finding 可能导致 arbitrary file read/write、command execution、secret leakage、auth bypass、XSS、protocol confusion 或 workspace escape，至少标为 High；可被触发且影响核心 contract 时标为 Critical。
- [ ] 如果缺少能证明 abuse case 被阻断的 negative test/fixture/schema check，把 verification gap 作为 finding 或 residual risk。
- [ ] 对跨 runtime、schema、examples、docs、automation 或 deployment 的 security-sensitive change，feasible 时要求 workspace/release verifier，并记录无法运行时的原因。
