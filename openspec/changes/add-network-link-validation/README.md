# add-network-link-validation

在显式联网且具备 SSRF 防护时验证 HTTP(S) 外链可达性并与确定性链接分类分离

## 当前状态

这是临时且未审计的 OpenSpec change。`tasks.md` 的 1.1 是唯一实现入口；完成前不得实施或视为已批准，也不得执行真实公共网络 smoke。

## 阅读顺序

1. `tasks.md` 1.1；2. `proposal.md`；3. `design.md` 的 numbered decisions；4. `specs/**/spec.md`。

## 直接依赖

- `introduce-content-quality-foundation`
- `add-file-policy-overrides`
- `add-markdown-link-validation`
