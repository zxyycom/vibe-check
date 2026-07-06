# 审查清单（Review Checklist）

仅在需要正式 checklist、second-pass review 或可复用 review prompt 时使用此参考。主 `SKILL.md` 仍是 review 行为与输出形状的权威来源。

## 紧凑工作表（Compact Worksheet）

```markdown
## Context（上下文）
- [ ] 我理解 intended behavior、touched surfaces 和 governing source。
- [ ] 我知道当前改动的 owner boundary：UI/route、service、domain、CLI/API、schema/example、docs、tests、generated artifacts 或 automation。

## Correctness（正确性）
- [ ] 改动符合 task/spec/user request。
- [ ] Edge cases 与 error paths 已处理。
- [ ] Touched surface 有验证证据：tests、fixture、schema/example validation、docs sync、smoke command、manual replay、screenshot 或 benchmark note，足以证明声明的 contract 或 observable semantics。
- [ ] Stable identifiers、pagination、ordering、defaults 和 errors 保持兼容，除非明确 breaking。

## Architecture（架构）
- [ ] 现有 patterns 与 ownership boundaries 保持不变，或新 pattern 有清楚理由。
- [ ] Owning layer 之外没有重复解析、路由、identifier 语义或 business rules。
- [ ] Machine output 与 readable output contracts 保持分离。
- [ ] 新 abstraction 有真实复杂度收益，不是为单一用例过早泛化。

## Security and Performance（安全与性能）
- [ ] 没有 secret 泄露、injection path、unchecked untrusted data 或 trust boundary 混淆。
- [ ] 没有 N+1、unbounded operation、意外 full-data load、render loop 或可避免的 hot-path cost。
- [ ] 新 dependency 有必要性说明，并经过 supply-chain、license、bundle/runtime/build impact 检查。

## Verification（验证）
- [ ] 验证 touched surface 的最小 tests/build/smoke/schema/docs/browser checks 已通过。
- [ ] 适用时，schema、examples、docs、fixtures 和 generated artifacts 已同步。
- [ ] 跨边界改动已按仓库规则运行 workspace/release verification，或记录跳过理由。

## Verdict（结论）
- [ ] Approve
- [ ] Request changes
- [ ] No findings with residual risk noted
```

## 可选独立复核（Optional Independent Pass）

只有在可用且被授权时，才使用第二 reviewer 或 model。它补充常规 review，不能替代自己的 findings-first pass。

```text
请审查这个 change 的 correctness、security、performance、maintainability
以及 public contract adherence。检查 owner boundary、machine/readable output、
schema/example/docs sync、identifier/pagination/default/error compatibility，
以及 required verification。

请 findings first 返回结果，按 severity 排序，并带 file/line references。
```

## 行动线索（Action Cues）

- Review 结论带上已审查 scope、证据和 verdict。
- Bug fix 新增或改变 stable observable semantics 时，验证证据证明修正后的行为。
- Security-sensitive change 包含 security-focused review。
- Diff scope 足够聚焦，reviewer 可以可靠追踪 touched surfaces。
- Review comment 带 severity 和明确 author action。
- Deferred cleanup 有 owner、reason 和 follow-up 条件。
