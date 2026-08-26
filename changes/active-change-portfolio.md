# Active Change Portfolio

本导航只列出当前 `bun run change-plan -- list changes` 报告的 active Changes。stage、任务进度和基线距离以该命令和各 Change artifact 为准；本文不证明实现、发布、归档或外部授权。

## 当前 Product 收敛

| Change | 当前范围 | 恢复入口 |
| --- | --- | --- |
| [refine-product-module-boundaries](refine-product-module-boundaries/) | 完成 Check settlement、Project Run outputs、Check-owned duplicate cache、路径和契约 hard cut。Plan 的任务均完成，但 Change 仍 active，未经授权不得 archive。 | proposal、design、tasks；当前行为见 `docs/`、源码和 tests。 |

## 后置 Product directions

| Change | 唯一方向 | 当前边界 |
| --- | --- | --- |
| [add-path-reference-validation](add-path-reference-validation/) | project-local prose/inline-code path validation。 | 需 corpus 证明 grammar precision，不与 Markdown destination 重复。 |
| [add-network-link-validation](add-network-link-validation/) | opt-in、SSRF-safe、bounded network reachability。 | 需 named consumer、安全 transport 与 hermetic evidence；不由现有离线 Link Check 推断。 |
| [add-secret-detection](add-secret-detection/) | high-confidence secret detection 与 leak-canary safety。 | 需 detector provenance/license、precision/recall corpus 与全 surface evidence。 |
| [port-lizard-function-metrics-to-typescript](port-lizard-function-metrics-to-typescript/) | `functionMetrics` 的 Lizard backend hard cut。 | 当前真实路径是 `src/package-checks/function-metrics/**`; 需先决定 public `scanner` options 演进。 |
| [define-project-run-log-evidence-boundaries](define-project-run-log-evidence-boundaries/) | future durable receipt/event sink owner boundary。 | 当前 Product outputs 仅为 machine publication 与 progress rendering；Gate transcript 是本地 evidence。 |

## 公开发布 Draft

| Change | 唯一方向 | 授权边界 |
| --- | --- | --- |
| [publish-public-api-only-npm-package](publish-public-api-only-npm-package/) | 在已验证 exact candidate 与 Gate 之后完成 npm public release。 | registry reads、credential access、publish 和 post-publish install 均需当次明确授权。 |

## 读取顺序

1. 运行 `bun run change-plan -- list changes`。
2. 读取目标 proposal/design；只有 Plan stage 才以 tasks 作为进度清单。
3. 当前产品事实以对应 `docs/` owner、源码、tests、package artifacts 为准；Decision 保存长期判断。
4. 历史 Change 只在明确需要形成时依据或演进审计时读取，不是 current portfolio 成员。
