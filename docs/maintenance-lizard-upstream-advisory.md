# Lizard upstream advisory

此仓库维护命令显式查询 Lizard 的 GitHub stable release，并将其与首轮 analyzer baseline `1.23.0` 比较；它只提示维护者，不修改代码、依赖、Decision 或支持范围。

## Run

```bash
bun run maintenance:lizard-upstream
```

这不是 Product Check、package public API 或默认 Project Gate member。只有运行此命令才发起网络请求；required/full Gate 保持离线，命令结果也不改变其 exit mapping。

## Transport and result

请求固定 HTTPS endpoint `https://api.github.com/repos/terryyin/lizard/releases/latest`，即 GitHub 上 `terryyin/lizard` 的 official release API。请求禁用 credentials 与 redirects，使用 `AbortSignal`、5 秒 timeout 和 64 KiB response limit；只允许 `tag_name` 进入 closed local release payload，随后只接受 canonical `v?MAJOR.MINOR.PATCH` version。

标准输出为一个 JSON advisory：

- `no-update` / `lizard-upstream-no-update`：latest stable release 不高于 `1.23.0`。
- `update-available` / `lizard-upstream-update-available`：发现更高 stable release；维护者需建立独立 Change 后才可采用。
- `unavailable`：`cancelled`、`timeout`、`network-error`、`http-error`、`response-too-large` 或 `response-invalid` 之一。它不伪造“无更新”，也不产生自动重试或阻断性结果。

该命令除了无效 CLI 参数外始终以 advisory 形式完成；任何网络失败不应被解释为 package、Product 或 Gate failure。
