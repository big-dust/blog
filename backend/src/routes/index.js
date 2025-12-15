const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: '博客API',
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
