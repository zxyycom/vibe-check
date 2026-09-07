# Proposal

将稳定发布元数据与文本材料交回可直接编辑的文件，保留必要的构建派生与完整性验收；本 Draft 不授权实施。

## Why

用户指出发布 package.json 和部分打包材料由 TypeScript 常量拼装，修改稳定文本需要跨生成器与断言同步。前轮已把 analyzer 归属说明改为仓库原文复制；
2026-09-07 复核确认 `writeCandidateManifest` 仍从常量组装 manifest，静态化候选尚未实施。本 Change 只承接这个剩余问题，不重复法律材料修复。

## Outcome

维护者能从明确的静态 owner 修改稳定 package 元数据；构建仅派生实际变化的版本和编译材料，staging、tarball、installed consumer 仍可证明消费了同一来源。
