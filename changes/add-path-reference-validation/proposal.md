# Proposal

本 Plan 保留高置信 project-local 文本路径引用 Check，但在首次公开发布后、出现真实 corpus 与 precision 证据时才恢复实施。

## Why

普通 prose/inline-code 中的路径会在文件移动后失效，但“看起来像路径”没有标准语法：过宽会产生大量误报，过窄则价值有限。旧计划又依赖 Markdown跨 Check segment handoff、shared file policy和已退出的 Manager/Task seam。当前首版应先完成标准化程度更高的 JSON/Markdown checks。

## Outcome

在真实 consumer corpus证明一个封闭 grammar具有可接受 precision之后，Package 可提供 ordinary `pathReferenceValidation` Check。它只处理 owning Check明确选择的 text segments，使用 global inventory-derived index验证 project-local targets，且不读取 target、不扩大 scope、不重复拥有 Markdown destination/autolink。

## Scope

### Intended Change

- 恢复时先用 representative corpus固定 source kinds、token grammar、precision/recall期望与 false-positive budget。
- 首选由同一 package-private Markdown parser在本 Check内部产生 visible prose/inline-code segments；不通过 Core final data或 Record传输 parser facts。
- 支持范围只到明确的 relative/project-root path token与可选 line/column hint；URL、absolute host path、glob、template、import/module/package语义排除。
- Target lookup只查询 global inventory files及其 ancestor directories；lexical root escape在任何 filesystem access前关闭，target内容不读取。
- Check-local Records、final counts与四态结果使用 safe project-relative data。
- 不纳入首次公开 release gate，不实现 Markdown destination、network、source imports、architecture dependencies或自动修复。

### Resulting Impacts

恢复实施需要先证明 segment owner和 grammar precision；不能因为 parser/helper已经存在就把启发式 detector当作低风险附加功能。

## Success Criteria

- Corpus与验收阈值能明确区分 supported token、unsupported text和真正 unresolved/escape defect。
- Markdown destination/autolink只由 Markdown Link Check拥有，同一 occurrence无重复 Records。
- Resolver不 lstat/read target、不follow symlink、不重新遍历项目，也不恢复 scope外路径。
- Records不含 host root/raw absolute path，identity不依赖当前位置；normal defect与 execution failure保持不同四态语义。
- 实施后的 public/package/docs/Case与 required/full Gate证据完整。

## Affected Owners

- `docs/scan-scope.md`：source eligibility与 inventory-only target index。
- `docs/configuration.md`：future ordinary value与 Check-owned options。
- `docs/quality-metrics.md`、`docs/output.md`：safe Records/final result。
- `src/package-checks/**`、`src/check/**`、`src/project-definition/**`、`src/index.ts`：future implementation/public surface。
- `docs/testing/cases/**`：corpus precision、owner去重、scope与安全证据。
