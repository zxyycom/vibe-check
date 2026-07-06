# Web 接口模式（Web Interface Patterns）

只有当用户明确要求 REST、GraphQL、TypeScript interface、frontend/backend boundary 或 component props 设计时，才读取本 reference。CLI/local-tool protocol、adapter、schema 和 readable output contract 使用 `local-tool-contracts.md`。

## REST 模式（Patterns）

- Endpoint 使用复数 resource noun。
- Error response 保持一种 structured shape。
- List endpoint 从一开始就设计 pagination。
- Filtering 和 sorting 使用 query parameter。
- 稀疏变更优先使用 partial update。
- 外部输入在 route/form/API boundary 验证；内部已验证数据不重复散落校验。

示例：

```text
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

## Error Shape

```typescript
interface APIError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

Status code、error code 和 details shape 应稳定；server error 不暴露 secret、stack trace 或内部路径。

## Pagination

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

Cursor pagination 适合实时或大数据集；page pagination 适合稳定排序和小到中等结果集。两者都要定义 ordering、limit、empty page 和 invalid cursor 行为。

## TypeScript 模式（Patterns）

使用明确的 input/output type：

```typescript
interface CreateTaskInput {
  title: string;
  description?: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

表达 variant 时，优先使用 discriminated union：

```typescript
type TaskStatus =
  | { type: "pending" }
  | { type: "in_progress"; assignee: string }
  | { type: "completed"; completedAt: Date };
```

## Component Props

- Props 表达 caller 可控制的 contract，不暴露内部 state shape。
- Boolean props 使用清晰语义；多个互斥模式优先用 union 或 `variant`。
- Event callback 命名和 payload shape 保持一致。
- 不把 server response 原样穿透到深层组件，先在 boundary normalize。

这些 pattern 是可选背景材料；当前项目 owner docs 或现有约定优先。
