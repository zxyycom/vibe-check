> **核心句：**本 tasks artifact 只保留离线 Markdown link check 的未来实施入口；1.1 完成前不得执行任何实现任务。

## 1. 实施前阻塞审计

- [ ] 1.1 **重新基线并细化 contract；本项完成前不得实施。**以届时主规范、运行时代码、活动决策以及已落地的 `quality-checks`、`quality-records`、`project-definition` 为依据，重新确认支持的 Markdown/link 语义、本地目标与锚点规则、项目范围、最终 record contract、外链分类和隐私安全边界；如需要接入 network check，先与其共同完成最小 transient handoff 审计并解决开放问题。随后完成阻塞审计，确认全部 artifacts 围绕核心句、capability ID 与 owner 一致，未把方向性材料误写为已批准方案，也未越过本 change 修改长期 owner 或其它 change，最终达到可唯一实施状态。

## 2. 实现入口

- [ ] 2.1 在 1.1 完成后，实现并接入内置离线 Markdown link CheckRunner，同步届时实际需要的 Project Definition authoring、owner docs 与公共契约。

## 3. 验证入口

- [ ] 3.1 为 1.1 确认的本地目标、锚点、范围和隐私结果建立最小充分测试证据，并按实际影响面运行产品与 workspace 验证，证明该能力不执行网络工作且不持久化敏感 URL 材料。
