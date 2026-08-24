# Proposal

本 Plan 在共同 Markdown document boundary 之后交付完全离线的本地文件与锚点 default Check，并把它纳入首次公开 package。

## Why

文档移动与标题重写会留下失效的相对链接和锚点。把外部 URL 请求混在同一 Check 会引入 SSRF、凭据和不可复现性；旧计划为未来 Network Check设计的 ephemeral cross-Check snapshot在当前 Product也没有安全 seam。首版应先闭合确定、离线且高价值的本地链接语义。

## Outcome

Package 公开 ordinary value `markdownLinkValidation`（`checkId = markdown-link-validation`）。它复用 package-private Markdown parse facts，验证 same-document anchors、project-local files与 cross-document anchors，拒绝绝对文件和 project-root escape；HTTP(S)、mailto与其它外部 schemes只被安全忽略，不触发 DNS/HTTP，也不向其它 Check交接 request material。

## Scope

### Intended Change

- 新增 `MarkdownLinkValidationOptions`，首版只包含 closed `requireExistingFiles`、`validateSameDocumentAnchors`、`validateCrossDocumentAnchors`、`forbidAbsoluteFilesystem` 与 `forbidProjectEscape`；`.md`/`.markdown` eligibility固定由本 Check实现并且只能消费 global scope。
- 从共同 document boundary消费 inline/reference/image/autolink occurrences和 heading index；undefined reference、invalid percent encoding、本地 missing/non-file、anchor missing、absolute/escape形成 safe Check-local Records。
- 所有 target resolution先做 lexical containment与 global-scope membership；跨文档 anchor read还需 ordinary-file和 realpath root containment，不递归发现目标。
- final data提供 document/link/local/external/issue counts；正常有 issue为 `failed`，无 issue为 `passed`，无 eligible input为 `not-applicable`，read/parse/protocol failure为 `unavailable`。
- 同步 public value/options、runtime validation、README/API example、owner docs、语义 Cases、Gate与 exact candidate。
- 不执行 DNS/HTTP/TLS/redirect/retry，不发布 external candidate、不读取 query credentials，不处理 HTML attributes/plain prose URLs，也不建立 shared file policy、comparison/reference或 cache。

### Resulting Impacts

共同 Markdown parser、heading slug、local resolver与 safe Record identity必须保持确定；Network Link Change不得把本 Change重新扩大为含网络 side effect的组合 Check。

## Success Criteria

- Inline/reference/image/autolink、undefined definitions、encoded paths/fragments、duplicate headings与 cross-file anchors有确定结果；external schemes始终零网络且不产生 reachability verdict。
- Absolute POSIX/Windows/file URI、lexical escape、scope miss与 symlink root escape在任何越界 read前关闭；公开 facts不含 project root或宿主绝对 path。
- Record identity不依赖 line/column/parser node/raw URL；当前位置只用于导航，query/userinfo/raw destination不进入 logs/cache/artifacts。
- Structure Check关闭或通过与否不影响本 Check；两者只复用 private implementation。
- Public/package/docs/Case证据、最窄 tests、typecheck、lint、required/full Gate与 exact candidate preparation全部通过。

## Affected Owners

- `docs/configuration.md`：default value与 closed offline-link options。
- `docs/scan-scope.md`：source/target scope、ordinary-file与 no-expansion boundary。
- `docs/quality-metrics.md`：link Records、final counts与 status folding。
- `docs/output.md`：safe local target data与 external-material exclusion。
- `src/checks/**`、`src/definition/**`、`src/index.ts` 与 package contract owners：resolver、Check implementation与 public surface。
- `docs/testing/cases/**`：occurrence/slug/path/security/zero-network/public-consumer evidence。
