const request = require('supertest');
const express = require('express');
const { db } = require('../config/database');
const searchRoutes = require('../routes/search');

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/search', searchRoutes);

describe('Search API', () => {
  let testUserId;
  let testCategoryId;
  let testArticleIds = [];

  // 设置测试数据
  beforeAll(async () => {
    try {
      // 创建测试用户
      const userResult = await db.query(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        ['testuser', 'test@example.com', 'hashedpassword']
      );
      testUserId = userResult.insertId;

      // 创建测试分类
      const categoryResult = await db.query(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        ['测试分类', '测试用分类']
      );
      testCategoryId = categoryResult.insertId;

      // 创建测试文章
      const articles = [
        {
          title: 'JavaScript 基础教程',
          content: '这是一篇关于 JavaScript 基础知识的文章。JavaScript 是一种动态编程语言，广泛用于 Web 开发。',
          summary: 'JavaScript 基础知识介绍',
          author_id: testUserId,
          category_id: testCategoryId
        },
        {
          title: 'React 组件开发',
          content: '本文介绍 React 组件的开发方法。React 是一个用于构建用户界面的 JavaScript 库。',
          summary: 'React 组件开发指南',
          author_id: testUserId,
          category_id: testCategoryId
        },
        {
          title: '数据库设计原则',
          content: '数据库设计是软件开发中的重要环节。良好的数据库设计能够提高系统性能和可维护性。',
          summary: '数据库设计最佳实践',
          author_id: testUserId,
          category_id: testCategoryId
        }
      ];

      for (const article of articles) {
        const result = await db.query(
          'INSERT INTO articles (title, content, summary, author_id, category_id) VALUES (?, ?, ?, ?, ?)',
          [article.title, article.content, article.summary, article.author_id, article.category_id]
        );
        testArticleIds.push(result.insertId);
      }
    } catch (error) {
      console.error('设置测试数据失败:', error);
      throw error;
    }
  });

  // 清理测试数据
  afterAll(async () => {
    try {
      // 删除测试文章
      if (testArticleIds.length > 0) {
        await db.query(
          `DELETE FROM articles WHERE id IN (${testArticleIds.map(() => '?').join(',')})`,
          testArticleIds
        );
      }

      // 删除测试分类
      if (testCategoryId) {
        await db.query('DELETE FROM categories WHERE id = ?', [testCategoryId]);
      }

      // 删除测试用户
      if (testUserId) {
        await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
      }
    } catch (error) {
      console.error('清理测试数据失败:', error);
    }
  });

  describe('GET /api/search', () => {
    test('should return validation error for empty query', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: '' });
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('搜索关键词不能为空');
    });
    
    test('should return validation error for missing query', async () => {
      const response = await request(app)
        .get('/api/search');
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should return validation error for whitespace-only query', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return search results for valid query', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'JavaScript' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.articles).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.keyword).toBe('JavaScript');
    });

    test('should highlight keywords in search results', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'React' });
      
      expect(response.status).toBe(200);
      
      if (response.body.data.articles.length > 0) {
        const article = response.body.data.articles[0];
        // 检查标题或摘要中是否包含高亮标签
        const hasHighlight = article.title.includes('<mark>') || 
                           article.summary.includes('<mark>');
        expect(hasHighlight).toBe(true);
      }
    });

    test('should return empty results for non-existent keywords', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'nonexistentkeyword12345' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: '开发', page: 1, limit: 2 });
      
      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    test('should sort results by relevance', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'JavaScript' });
      
      expect(response.status).toBe(200);
      
      if (response.body.data.articles.length > 1) {
        const articles = response.body.data.articles;
        // 检查相关性评分是否按降序排列
        for (let i = 0; i < articles.length - 1; i++) {
          expect(articles[i].relevance_score).toBeGreaterThanOrEqual(articles[i + 1].relevance_score);
        }
      }
    });
  });
});