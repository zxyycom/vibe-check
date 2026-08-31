# Active Change Portfolio

本导航只列出当前 `bun run change-plan -- list changes` 报告的 active Changes。stage、任务进度和基线距离以该命令和各 Change artifact 为准；本文不证明实现、发布、归档或外部授权。

## 后置 Product directions

| Change | 唯一方向 | 当前边界 |
| --- | --- | --- |
| [add-html-link-validation](add-html-link-validation/) | explicit HTML link-bearing attribute 的本地引用校验。 | 当前仅保留 Draft；需 named consumer、source/attribute corpus、parser 与 occurrence owner 证据。 |
| [add-network-link-validation](add-network-link-validation/) | opt-in、SSRF-safe、bounded network reachability。 | 需 named consumer、安全 transport 与 hermetic evidence；不由现有离线 Link Check 推断。 |
| [add-secret-detection](add-secret-detection/) | high-confidence secret detection 与 leak-canary safety。 | 需 detector provenance/license、precision/recall corpus 与全 surface evidence。 |
| [port-lizard-function-metrics-to-typescript](port-lizard-function-metrics-to-typescript/) | `functionMetrics` 的 Lizard backend hard cut。 | 配置 Change 已完成；恢复实施时需按当前 `src/package-checks/function-metrics/**` 重新建立 constructor parity 与迁移证据。 |

## 公开发布 Plan

| Change | 唯一方向 | 授权边界 |
| --- | --- | --- |
| [publish-public-api-only-npm-package](publish-public-api-only-npm-package/) | 形成 formal-version exact artifact，让同一 tarball 通过 full Gate 后完成 npm public release。 | 当前授权仅覆盖 local tooling、artifact build、tests 与 Gate；registry reads、credential access、publish 和 post-publish install 均需新的当次明确授权。 |

## 读取顺序

1. 运行 `bun run change-plan -- list changes`。
2. 读取目标 proposal/design；只有 Plan stage 才以 tasks 作为进度清单。
3. 当前产品事实以对应 `docs/` owner、源码、tests、package artifacts 为准；Decision 保存长期判断。
4. 历史 Change 只在明确需要形成时依据或演进审计时读取，不是 current portfolio 成员。
