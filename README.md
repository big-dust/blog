# 个人博客系统

基于 React + Node.js + MySQL 的全栈个人博客系统。

## 项目结构

```
personal-blog/
├── frontend/          # React 前端应用
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # Node.js 后端 API
│   ├── src/
│   ├── database/
│   └── package.json
└── README.md
```

## 快速开始

### 数据库设置

1. 确保 MySQL 服务运行在 localhost:3306
2. 使用 root/root 作为用户名/密码
3. 执行数据库初始化脚本：

```bash
mysql -u root -p < backend/database/init.sql
```

### 后端启动

```bash
cd backend
npm install
npm run dev
```

后端服务将运行在 http://localhost:3001

### 前端启动

```bash
cd frontend
npm install
npm start
```

前端应用将运行在 http://localhost:3000

## 功能特性

- 文章发布和管理
- 分类和标签系统
- 全文搜索功能
- 评论系统
- 响应式设计
- JWT 身份认证
- SEO 优化

## 技术栈

**前端**
- React 18
- React Router
- 原生 CSS

**后端**
- Node.js
- Express.js
- MySQL2
- JWT

**数据库**
- MySQL 8.0+

## 开发说明

项目采用前后端分离架构，前端和后端独立开发和部署。详细的开发文档请参考 `.kiro/specs/personal-blog/` 目录下的规格文档。