const express = require('express');
const cors = require('cors');
// require('dotenv').config();

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
const PORT = 3001;

// 跨域
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));


// api 路 由
app.use('/api', indexRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/upload', uploadRoutes);

app.use('/uploads', express.static('uploads'));

// home
app.get('/', (req, res) => {
  res.json({ 
    message: '博客API',
    version: '1.0.0'
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ error: '找不到页面' });
});

// error
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
