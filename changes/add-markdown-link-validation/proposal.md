# Proposal

本 Proposal 是实现离线 Markdown local-link/anchor validation built-in Check 的临时计划；网络可达性由独立 Change承接。

## Why

文档移动、重命名和生成会留下失效相对链接、跨文档锚点和项目根逃逸目标。当前仓库脚本只覆盖有限相对路径，不能代表 Product的 GFM、anchor、symlink或安全边界；直接把外链请求混入同一检查又会引入网络授权、凭据和不可复现结果。

## Outcome

Vibe Check 提供 stable `checkId = markdown-link-validation` 的 built-in Check，通过共同 GFM document boundary解析 inline、reference、image和autolink occurrences，离线验证项目内文件与 anchors，拒绝绝对/逃逸目标，并在 Check 完整完成后发布 sanitized、invocation-private external candidate snapshot。独立 Network Check只能通过 Check-level `requiresChecks` 消费该 snapshot；Link Check不执行 DNS/HTTP，也不吸收 network outcome。

## Scope

纳入：

- Markdown link occurrence extraction、mutually-exclusive classification、percent decoding、query/fragment拆分和 source location。
- Same-document anchor、project-local file、cross-file anchor、absolute/file URI、lexical escape和symlink escape验证。
- Versioned `gfm-heading-slug-v1` heading index、三个 record types、line-independent occurrence identity、target-aware comparison/cache和 CheckResult。
- Project Definition/file-policy规则，以及 Link-owned external candidate snapshot、candidate safe shape与 bounded ephemeral request/location lookups。
- 与 `add-network-link-validation` 和 `add-path-reference-validation` 的明确 ownership handoff。

不纳入：DNS、HTTP/TLS、redirect、retry、rate limit、network cache、external reachability verdict、formatter/auto-fix、generic prose path detection，以及让 structure policy决定 link behavior。

## Success Criteria

- 每个 supported link occurrence恰好得到一个离线分类；本地目标/anchor按启用规则产生 catalog-valid records，external/mailto/other schemes分类时网络调用始终为零。
- 所有 local reads在 lexical containment、inventory/resource approval和 existing-target realpath containment后发生；绝对、file URI、project escape和symlink escape不会读取根外内容。
- Anchor slug、duplicate suffix、encoded path/fragment、undefined reference和 missing/non-file target有确定、可定位、跨平台测试结果。
- External handoff不包含 raw/full URL、userinfo、query values、fragment或location；敏感 request material只存在 invocation memory，Network Check只在 Check-level `requiresChecks`满足后读取 Link完成时发布的 snapshot，并在消费后释放，不能依赖 Link Task ID或把材料写入 log/cache/artifact/public DTO。
- Structure Check关闭不影响 link结果，Path Reference Check不重复解析 Markdown destination/autolink；owner同步、测试证据和 workspace required verification全部通过。

## Affected Owners

- `docs/architecture.md`：共同 Markdown document boundary、Link Check、本地 resolver和 network handoff方向。
- `docs/configuration.md`：Project Definition built-in policy、neutral contribution和文件政策。
- `docs/scan-scope.md`：Markdown exact inputs、target resource approval与 root boundary。
- `docs/output.md`：link records、safe locations/targets和external handoff不公开边界。
- `docs/testing.md` 与 `docs/testing/cases/`：GFM links、path/anchor/security、identity、comparison和入口证据。
- `src/product/**`：唯一 Product runtime parser、resolver、Check binding和ephemeral handoff owner。
