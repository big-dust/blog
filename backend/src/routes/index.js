const express = require('express');
const router = express.Router();

// 基础路由
router.get('/', (req, res) => {
  res.json({
    message: '个人博客 API',
    version: '1.0.0',
    endpoints: {
      articles: '/api/articles',
      auth: '/api/auth',
      categories: '/api/categories',
      tags: '/api/tags',
      search: '/api/search'
    }
  });
});

module.exports = router;