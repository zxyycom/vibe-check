执行约束：task 0.4 未完成时不得开始 section 1。关闭后按章节顺序推进；只有 implementation
与指定证据都完成后才勾选任务。修改测试正文或实体时，同时执行当前 test-evidence
review/check workflow。

## 0. Implementation Readiness

- [x] 0.1 审计 proposal、design、deltas、当前 explicit-config implementation、owner docs
  与 external fixture；确认 existing exact-input/config-path behavior 已实现并归档。
- [x] 0.2 选择单一 mixed repository-neutral starter，排除 preset taxonomy、language
  detection、network access 和 package-script mutation。
- [x] 0.3 盘点 Vibe Check-specific default values，并为 selected config、declared
  `VIBE_CHECK_*` tool overrides 与 CLI overrides 定义单一 owner/precedence。
- [ ] 0.4 与 `port-lizard-function-metrics-to-typescript` 收敛最终
  `QualityConfig.tools` shape：记录 port 已完成、已取消，或已明确延期且接受后续 config
  migration。Rebase 后重跑 OpenSpec audit；本项关闭前不得实施。

## 1. Config Selection and Provenance

- [ ] 1.1 在 Product Config owner 增加 `SelectedConfig` context，包含 parsed config、
  source、normalized absolute path、version 与 applied tool override names。
- [ ] 1.2 省略 `--config` 时，只发现
  `<project-root>/vibe-check.config.json`。
- [ ] 1.3 保持显式 `--config` 最高优先级，并证明 explicit/discovered configs 不 merge。
- [ ] 1.4 File selection 后只应用受支持 `VIBE_CHECK_*` tool overrides，再应用既有显式
  `--top-n` / `--artifact-dir`；证明没有其它 default/environment merge。
- [ ] 1.5 Missing config 在 banner、scanner、baseline、cache 和 artifacts 前以 exit `3`
  失败，并显示两条恢复命令。
- [ ] 1.6 把一个 resolved config 交给 current、baseline 与 Git-fallback collection；tool
  preflight 前打印 source、path、version、applied overrides，且不改变 machine v1。

## 2. Initialization Workflow

- [ ] 2.1 增加 top-level `init [project-root]` routing 与 root/operation help，不进入 scan
  core。
- [ ] 2.2 为 neutral scope、areas、thresholds、report、artifact/cache paths 定义
  deterministic complete starter values；port 完成时使用固定 PATH commands `scc` /
  `jscpd` 与 empty args，否则按 task 0.4 记录的 tool shape 显式 rebase。
- [ ] 2.3 用稳定 formatting 生成 UTF-8 JSON，并 exclusive create
  `<project-root>/vibe-check.config.json`。
- [ ] 2.4 对 missing/non-directory/unwritable roots 和 existing paths 返回 actionable
  errors；证明原 bytes 不变。
- [ ] 2.5 证明 generated config 不含 source-checkout absolute path 或 Vibe Check-specific
  globs、areas、report text、artifact paths。
- [ ] 2.6 打印 created path 与精确下一步 `scan` command；不检查语言、不扫描、不联网、不
  修改 package scripts。

## 3. Dogfood Migration and Acceptance

- [ ] 3.1 把当前 repository-specific config values 迁入 checked-in
  `<repo-root>/vibe-check.config.json`，并按最终 current tool shape rebase。
- [ ] 3.2 让所有 `quality:*` wrappers 显式传入 repository root 与
  `--config vibe-check.config.json`；wrapper 继续单向 pass-through。
- [ ] 3.3 扩展 external fixture 的 temporary copy，覆盖 init 后 discovery、explicit
  precedence、missing config、existing-file preservation 和 launch-cwd independence。
- [ ] 3.4 增加 selected source/path/version/applied-override 与 no-scanner-before-config
  assertions。
- [ ] 3.5 增加 dogfood acceptance，证明 checked-in config、受支持 tool overrides 与
  quick/full/gate wrapper outcomes 可用。
- [ ] 3.6 更新所有 changed/new test entities 的 semantic Cases，并证明完整当前 entity
  closure。

## 4. Owners and Delivery Verification

- [ ] 4.1 更新 CLI、Configuration、Scan Scope、Architecture、Testing、Script Tooling 与
  navigation owners，记录 discovery、exclusive init、precedence、provenance、dogfood path
  和 machine boundary。
- [ ] 4.2 运行 focused config/parser/CLI/entry/dogfood tests，再运行 product/scripts
  typecheck 与 lint。
- [ ] 4.3 从各 project root 外重放 init、discovered scan、explicit scan、missing-config
  failure 与 dogfood wrapper smoke。
- [ ] 4.4 运行完整 test-evidence strict check，确认 changed proof targets 保持语义映射。
- [ ] 4.5 运行 `bun run validate` 与
  `bun run verify:vibe-check-workspace:required`。
- [ ] 4.6 运行 OpenSpec strict validation、`git diff --check` 与定向搜索，证明未引入
  implicit `DEFAULT_CONFIG` fallback、wrapper-owned config merge、parent discovery 或
  machine-v1 provenance field。
