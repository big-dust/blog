const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 导入数据库配置
const { initDatabase } = require('./config/database');

// 导入路由
const indexRoutes = require('./routes/index');
const articlesRoutes = require('./routes/articles');
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const tagsRoutes = require('./routes/tags');
const searchRoutes = require('./routes/search');
const commentsRoutes = require('./routes/comments');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// 基础中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 提供上传的图片访问
app.use('/uploads', express.static('uploads'));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api', indexRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/upload', uploadRoutes);

// 基础路由
app.get('/', (req, res) => {
  res.json({ 
    message: '个人博客 API 服务器运行中',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在',
      path: req.originalUrl
    }
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || '服务器内部错误',
      timestamp: new Date().toISOString()
    }
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库连接
    await initDatabase();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`API 文档: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error.message);
    process.exit(1);
  }
};

// 导出 app 用于测试
module.exports = app;

// 只有在直接运行此文件时才启动服务器
if (require.main === module) {
  startServer();
}