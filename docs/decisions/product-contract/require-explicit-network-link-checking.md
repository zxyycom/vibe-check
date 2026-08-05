---
title: 网络链接检查必须显式启用
status: archived
alignment: null
createdAt: 2026-08-04T15:02:13Z
purpose: 防止普通质量扫描隐式访问网络，并让外链结果具备明确的安全和可复现边界。
background: DNS 和 HTTP 会引入 SSRF、环境凭据、临时故障与不可复现结果，不能由 profile 或 gate 自动开启。
decision: 网络外链能力默认离线，只有 file-backed policy 显式选择 online 才可执行受限请求。
relations: []
---

## 目的
- 让用户能够在明确知情的政策下检查外链可达性，同时保证默认扫描、初始化和离线链接验证没有网络副作用。
- 让网络失败、安全拒绝和稳定 broken-link 结果保持不同语义，避免临时环境问题制造错误门禁。

## 背景
- 外部 URL 可达性不能由 Markdown 解析证明，实际验证需要 DNS、socket、redirect 和 HTTP response。
- 未受限目标可能访问 loopback、private、link-local、cloud metadata 或 DNS rebinding 地址；ambient proxy 和 credentials 还会让不同环境产生不同权限和结果。
- Timeout、TLS、429 和 5xx 通常只能证明本次操作不确定，不能稳定证明链接已经失效。

## 决策
- 采用: Neutral default 和缺失 network section 保持 offline；只有 file-backed policy 显式设置 online 才请求网络能力，CLI profile、gate 或环境变量不得自动提升权限。
- 采用: Initial target、每次 redirect 和 retry 都经过 scheme、host、DNS 与全部解析地址检查；请求使用固定上限、受控 redirect和不依赖 ambient credentials/proxy 的 transport boundary。
- 采用: 只有稳定且定义明确的 HTTP/redirect结果形成 broken finding；DNS、transport、TLS、timeout、rate limit和临时服务失败保持 operational indeterminate并影响 completeness。
- 不采用: 普通 Markdown link validation直接发请求，或以公共站点的实时结果作为 required test evidence。
