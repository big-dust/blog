# Design Document: 代码人性化改造

## Overview

本设计文档描述如何将 AI 生成的"完美"代码改造成更像初学者学生编写的自然风格代码。改造将在不影响任何现有功能的前提下进行，主要涉及注释、命名、格式、错误处理、CSS 样式，以及删除所有测试代码（因为初学者通常不写测试）。

## Architecture

改造采用分层递进的方式进行：

```
┌─────────────────────────────────────────┐
│           Backend 改造                   │
│  ├── routes/*.js (API路由)              │
│  ├── middleware/*.js (中间件)           │
│  ├── utils/*.js (工具函数)              │
│  └── __tests__/ (删除整个目录)          │
├─────────────────────────────────────────┤
│           Frontend 改造                  │
│  ├── components/*.js (组件)             │
│  ├── pages/*.js (页面)                  │
│  ├── services/*.js (服务)               │
│  ├── contexts/*.js (上下文)             │
│  ├── *.css (样式文件)                   │
│  └── *.test.js (删除所有测试文件)       │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### 改造范围

| 模块 | 文件数量 | 改造重点 |
|------|---------|---------|
| Backend Routes | 7 | 注释、命名、错误响应、历史痕迹 |
| Backend Utils | 3 | JSDoc移除、命名简化 |
| Backend Tests | 13 | 全部删除 |
| Frontend Components | 15 | 注释、命名、注释掉的旧代码 |
| Frontend Pages | 6 | 注释、命名 |
| Frontend Services | 8 | 类结构简化 |
| Frontend Tests | 4 | 全部删除 |
| CSS Files | 20+ | 单位混用、注释移除 |

### 不改动的部分

- 文件目录结构（除测试文件外）
- 数据库 schema
- API 接口定义
- 核心业务逻辑

## Data Models

无数据模型变更，所有数据结构保持不变。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

由于本次改造是纯代码风格重构，且会删除所有测试代码，验证方式为手动功能测试。

Property 1: 功能完整性保持
*For any* API 端点和前端页面，在代码改造后，该功能应当仍然正常工作
**Validates: Requirements 6.3, 7.3**

## Error Handling

改造后的错误处理风格：

### 改造前（AI风格）
```javascript
res.status(500).json({
  error: {
    code: 'FETCH_ARTICLES_FAILED',
    message: '获取文章列表失败',
    timestamp: new Date().toISOString()
  }
});
```

### 改造后（学生风格）
```javascript
// 获取失败了
res.status(500).json({ error: '获取失败' });
```

## Testing Strategy

### 验证方式

由于测试代码将被全部删除（初学者不写测试），验证方式为：

1. **手动功能测试** - 启动前后端服务，手动测试核心功能
2. **代码审查** - 检查改造后的代码风格是否符合"初学者"特征

### 验证步骤

```bash
# 启动后端
cd backend && npm start

# 启动前端
cd frontend && npm start

# 手动测试：
# - 首页文章列表
# - 文章详情页
# - 登录功能
# - 评论功能
# - 搜索功能
```

## 具体改造规则

### 1. 注释改造规则

| 改造前 | 改造后 |
|--------|--------|
| `/** JSDoc 多行注释 */` | 删除 |
| 每个函数都有注释 | 大部分函数无注释 |
| 详细的参数说明 | 删除 |
| 中规中矩的注释 | 偶尔写一句，可能有错别字 |

示例：
```javascript
// 改造前
/**
 * 验证用户输入
 * @param {Object} data - 用户数据
 * @returns {boolean} 验证结果
 */

// 改造后
// 检查一下数据对不对
// 或者用拼音：jiaoyan shuju
```

### 2. 命名改造规则

| 改造前 | 改造后 |
|--------|--------|
| `authenticateToken` | `checkToken` |
| `handleInputChange` | `handleChange` |
| `existingArticle` | `article` 或 `found` |
| `validationError` | `err` |
| `createdComment` | `result` |

### 3. 错误响应改造规则

| 改造前 | 改造后 |
|--------|--------|
| `{ error: { code, message, timestamp } }` | `{ error: '简短消息' }` |
| 详细的错误码 | 删除 |
| ISO时间戳 | 删除 |

### 4. CSS 改造规则

| 改造前 | 改造后 |
|--------|--------|
| 全部使用 rem | 混用 px 和 rem |
| `#f8f9fa` | 有时用 `lightgray` |
| 详细注释 | 基本无注释 |

### 5. 代码格式改造规则

- 移除过于整齐的变量对齐
- 某些地方减少空行
- 保持基本缩进正确

### 6. 历史痕迹规则（新增）

在代码中添加一些"开发历史"的痕迹：

```javascript
// 示例1：注释掉的旧代码
// const data = fetchData();  // 旧的写法
// const data = await fetchData(); // 改成异步了
const data = await getData();

// 示例2：TODO注释
// TODO: 这里以后要优化一下

// 示例3：临时修复
// 先这样写，能跑就行
```

### 7. 测试代码处理

删除所有测试相关文件：
- `backend/src/__tests__/` 整个目录
- `frontend/src/**/*.test.js` 所有测试文件
- `frontend/src/setupTests.js`
- 清理 package.json 中的测试脚本（可选保留）
