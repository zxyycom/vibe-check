# Tasks

任务先接入当前基础 seam，再实现 policy projection、resolution、scope handoff 与可解释入口，最终以 owner 同步和行为证据闭合。

## Readiness

- [x] 0.1 已核对 proposal、design 与 tasks 均以“声明式、typed、ordered 且不能扩大 global inventory 的文件政策”为同一目标，未保留 JSON config-v2 或旧 capability/finding 模型。
- [x] 0.2 已读取当前 Configuration、Scan Scope、CLI、Architecture owner，恢复 `use-file-policy-overrides`、`use-bun-typescript-project-definition` 与运行时 Check/Record 活动决策，并确认受影响 owner 与依赖顺序。
- [x] 0.3 已明确 closed patch、array/object precedence、absent optional policy、current/reference、cache projection、trusted Project Definition 与 explain 边界；没有阻塞实施的开放问题。

## Implementation

- [ ] 1.1 在基础 Change seam 落地后，先运行并恢复相关 test-evidence Cases；为 schema-derived patch、非法 owner/key/value/glob、ordered merge、absent base、scope、current/reference、cache 和 explain side-effect 边界建立失败证据。
- [ ] 1.2 扩展 Project Definition normalized model与每项 Check 的 serializable policy schema metadata，派生 closed partial patch，并在 pre-work validation 中拒绝 unknown Check、base-only leaf、函数、`null`、空 patch、非法 glob 与 absent-base construction。
- [ ] 1.3 实现 invocation-owned resolver：共用 normalized project-relative matcher，按 declaration order 做 object-leaf/array-whole replacement，调用 Check-owned semantic validation，深冻结 resolved policy 与 ordered provenance，并按 normalized path 进行局部 memoization。
- [ ] 1.4 在 global inventory 后接入 per-Check exact-input selection和 current/reference 共用 snapshot；为缓存消费者增加 Check-owned relevant-policy projection，证明 override 不能扩大 scope 或造成无关 cache invalidation。
- [ ] 1.5 实现 `explain-config [project-root] <path>` 的 routing、help、Project Definition load、同 resolver 人读投影与 failure mapping，确保输出区分 policy resolution 与 inventory membership，并且不启动 Check、baseline、cache、artifact 或 network work。
- [ ] 1.6 同步 Configuration、Scan Scope、CLI、Architecture、authoring declarations、示例及语义 Cases；删除被 Project Definition 基础 Change 取代的旧 JSON-only 假设，不在本 Change 建立双读或第二套 merge owner。

## Verification

- [ ] 2.1 运行最窄的 Project Definition validation、patch projection、resolver、scope、reference、cache 与 CLI tests，并在测试正文或 Case 变化后运行 `bun run test-evidence:check`。
- [ ] 2.2 运行产品 import boundary、`bun run typecheck:product`、`bun run lint:product`、`bun run test:product` 与相关 CLI acceptance，确认 trusted definition 与 explain side-effect 语义一致。
- [ ] 2.3 运行 `bun run validate` 和 `bun run verify:vibe-check-workspace:required`，复核最终 diff 只有一个 policy schema/resolver owner、没有 scope expansion、feature-local merge、JSON dual reader 或未记录 public contract drift。
