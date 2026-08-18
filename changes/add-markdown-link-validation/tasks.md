# Tasks

任务先闭合离线 occurrence/path/anchor语义，再接通 external candidate和跨 owner证据。

## Readiness

- [x] 0.1 已将 proposal、design和tasks核对为“离线 Markdown links + local/anchor records + safe external handoff”，并按活动决策统一使用 Check/Record与 Project Definition。
- [x] 0.2 已核对当前 docs owners、`src/product/**`、四个基础 Changes、Structure Change拥有的 Markdown boundary，以及 network/path-reference计划的消费边界。
- [x] 0.3 已固定 supported occurrences、五项 policy、三个 record types、path/symlink security、slug、line-independent identity、Check-complete external candidate snapshot/lookups、comparison/cache和测试矩阵；没有阻塞实施的问题。

## Implementation

- [ ] 1.1 在基础 ports可用后，注册 `markdown-link-validation` CheckDefinition、三个 record types、private binding、neutral built-in reference和 owner-validated base/file policy；不建立平行 identity或policy入口。
- [ ] 1.2 按测试证据流程先建立 inline/reference/image/autolink、classification、encoding、path containment和slug失败证据，再复用并按需扩展 Structure Change拥有的 Markdown document boundary，完成 occurrence adapter而不新增 parser owner。
- [ ] 1.3 实现 lexical/inventory/realpath local resolver、file/anchor validation、`gfm-heading-slug-v1`和 closed records；保证 rules disabled不授权读取且 Path Reference不重复消费 Markdown destination/autolink。
- [ ] 1.4 实现 sanitized `ExternalLinkCandidate`、line-independent occurrence identity及两个 bounded ephemeral lookups；只在 Link Check完整完成后发布 ordered invocation-private snapshot，并让获得授权的 Network Check仅通过 Check-level `requiresChecks`消费/释放，禁止跨 Check Task ID或Task `needs`依赖。
- [ ] 1.5 接入 per-file TaskPlan、CheckRun/CheckResult、source/target named-reference relations和 offline-safe cache；同步 Architecture、Configuration、Scan Scope、Output、测试 Cases、canonical materials和consumer docs。

## Verification

- [ ] 2.1 运行最窄 GFM occurrence、URL/path classification、resolver/slug、record catalog/identity、handoff、comparison/cache和正式 CLI tests；覆盖undefined reference、invalid encoding、query/fragment、duplicate headings、missing/non-file、POSIX/Windows/file URI、lexical/symlink escape及target-only变化。
- [ ] 2.2 运行 zero-network/DNS与 credential canary tests、Structure/Link/Path/Network组合 acceptance，并证明完整/failed Link run分别发布/不发布snapshot、Network只经Check-level `requiresChecks`消费且没有跨Check Task依赖；再运行`bun run test-evidence -- check --root .`、product import/typecheck/lint/tests、`bun run validate`和`bun run verify:vibe-check-workspace:required`。
- [ ] 2.3 复核 raw/full URL、userinfo、query values、fragment、location和absolute target不进入candidate identity、logs、cache、artifacts或public records，并确认 Success Criteria与owner同步有证据；未经授权不转换阶段或归档。
