const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./config/database');

// 路由
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

// 跨域
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use('/uploads', express.static('uploads'));

// 打印请求日志
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// api路由
app.use('/api', indexRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/upload', uploadRoutes);

// 首页
app.get('/', (req, res) => {
  res.json({ 
    message: '博客API',
    version: '1.0.0'
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ error: '找不到页面' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.log('出错了:', err.message);
  res.status(500).json({ error: '服务器错误' });
});

// 启动
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`服务器跑在 ${PORT} 端口`);
    });
  } catch (err) {
    console.log('启动失败:', err.message);
    process.exit(1);
  }
};

module.exports = app;

if (require.main === module) {
  startServer();
}
