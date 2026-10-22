# Proposal

以完整输入清单缩小独立 fixture，并只在需要时加载 Validation layout；保留所有验收。

## Why

调查确认全仓 fixture 复制绝大部分文件不参与指纹，materials 路径还支付未调用的 layout/TypeScript 加载成本。

## Outcome

两个热点移除无效准备，生产指纹语义、独立副本及默认完整 validation 不变，有真实前后收益和完整 Gate 证据。

## Scope

### Intended Change

抽出 artifact owner 的当次完整输入清单供真实 hash 与 fixture 复制共同消费；Validation 在非 materials 且材料成功后才加载 layout。Project、runner、预算和调度不动。

### Resulting Impacts

保留指纹顺序、原始 bytes、工具链绑定与全部原敏感性断言；补充新增输入、无关目录、独立副本及默认/短路/加载失败证明；同步内部 owner 与 Case。

## Success Criteria

同 frozen source 的新旧指纹一致；独立 fixture 覆盖完整当次输入；materials 不加载 layout，默认路径仍运行并传播失败；正式 before/after 测量、完整 Test Evidence、局部工程检查、required/all Gate、独立文档影响审查通过。

## Affected Owners

Package artifact、workspace/material validation、测试策略/Case、Change 协调。无 Product API、公开材料或 Project 架构变更。
