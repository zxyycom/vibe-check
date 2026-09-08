# Design

按用户任务组织公开契约，以导航连接同一契约与内部实现责任。

## Context

当前随包 Markdown 由显式 API、Check 和 machine registries 发布。既有工作区包含回调专题与 Definition/Controls 说明，本次保留并整合；不修改 runtime 签名或执行逻辑。

## Goals / Non-Goals

目标是可独立使用的阅读路径与唯一规则定义位置。非目标包括新增产品能力、机械按行数拆页、重写既有历史材料或发布 npm 包。本轮收尾按用户明确授权完成 Change 归档与 Git 提交。

## Decisions

### Intended Change

采用已确认的受众、发布范围、契约归属三个正交维度。公开可观察行为由对应用户专题定义，内部文档拥有实现不变量与验证；入口和示例引用契约。

API 主文保留 Run 共同模型；输出与类型化依赖独立成篇；learned history 使用独立专题。各 Check 前置完整最小示例。保留有使用价值的限制，移走包维护细节与迁移口吻。

### Resulting Impacts

移动 managed fences 时同步 registry 与 CLI stale-projection fixture 的目标路径，不改 allowlisted 示例源码。随包 Check 的手写最小示例关闭 machine publication；维护提醒示例显式 enforcing，确保不可测 baseline 不显示为通过。progress Case 随原契约移动 owner，保持 Case ID、实体与证明目的。README 直链所有 API 专题。更新当前 inbound anchors 与内部 owner；检查导航发布范围与现有 registry 一致。共享 scheduling 文档与 learned 算法 Change 只存在编辑冲突，不建立产品依赖。

## Risks / Trade-offs

拆页可能遗失局部语境或失败边界，需逐段核对与仅凭随包文档的使用审查。导航映射是阅读路由，不作为第二份发布清单或独立行为规则。

## Open Questions

无阻塞问题。用户已在正文调整后授权再次进行 AI-ready 复审，再归档本 Change 并提交当前文档工作。

## Implementation Observations

独立审查要求真正收敛公开/内部双 owner：flags、preflight、typed dependency 和 message shape 的公开规则留在随包页面；内部保留 validation、normalization、fingerprint 与 lifecycle 推导。API 主文从本轮开始时 369 行缩至166 行；scheduling 332 行缩至 258 行，独立输出/依赖/learned 专题拥有各自任务。

首轮 Gate 发现旧 output anchor、Case owner、CLI mutation target 和 registry 格式四处联动缺口，均按当前 owner 修复；没有 Product 行为故障或新增功能。

用户复审后继续本 Change 的正文调整：README 先讲 Definition / Run 再列可选工具；输出指南按默认行为、常用配置、预览、日志与失败处理展开；指南开头改用用户任务，清理冗余负向枚举和无参照的迁移口吻。保留使用限制、失败语义和受管示例，不再拆文件或修改产品契约；标题变化只同步当前 inbound links。
