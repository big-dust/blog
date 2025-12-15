const request = require('supertest');
const express = require('express');
const categoriesRouter = require('../routes/categories');
const { initDatabase } = require('../config/database');

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/categories', categoriesRouter);

describe('Categories API', () => {
  beforeAll(async () => {
    // 初始化数据库连接
    await initDatabase();
  });

  describe('GET /api/categories', () => {
    test('should return list of categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/categories/:id', () => {
    test('should return category details for valid ID', async () => {
      // 首先获取所有分类以获得一个有效的ID
      const categoriesResponse = await request(app).get('/api/categories');
      
      if (categoriesResponse.body.data.length > 0) {
        const categoryId = categoriesResponse.body.data[0].id;
        
        const response = await request(app)
          .get(`/api/categories/${categoryId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(categoryId);
        expect(response.body.data.name).toBeDefined();
      }
    });

    test('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get('/api/categories/99999')
        .expect(404);

      expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });

    test('should return 400 for invalid category ID', async () => {
      const response = await request(app)
        .get('/api/categories/invalid')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CATEGORY_ID');
    });
  });

  describe('GET /api/categories/:id/articles', () => {
    test('should return articles for valid category', async () => {
      // 获取一个分类ID
      const categoriesResponse = await request(app).get('/api/categories');
      
      if (categoriesResponse.body.data.length > 0) {
        const categoryId = categoriesResponse.body.data[0].id;
        
        const response = await request(app)
          .get(`/api/categories/${categoryId}/articles`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.category).toBeDefined();
        
        // 如果没有文章，应该有空状态信息
        if (response.body.data.length === 0) {
          expect(response.body.empty_state).toBeDefined();
          expect(response.body.empty_state.message).toContain('暂无文章');
        }
      }
    });

    test('should return 404 for non-existent category articles', async () => {
      const response = await request(app)
        .get('/api/categories/99999/articles')
        .expect(404);

      expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });
});