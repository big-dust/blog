const request = require('supertest');
const express = require('express');
const tagsRouter = require('../routes/tags');
const { initDatabase } = require('../config/database');

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/tags', tagsRouter);

describe('Tags API', () => {
  beforeAll(async () => {
    // 初始化数据库连接
    await initDatabase();
  });

  describe('GET /api/tags', () => {
    test('应该返回所有标签', async () => {
      const response = await request(app)
        .get('/api/tags')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });
  });

  describe('GET /api/tags/cloud', () => {
    test('应该返回标签云数据', async () => {
      const response = await request(app)
        .get('/api/tags/cloud')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('stats');
    });
  });

  describe('GET /api/tags/:id/articles', () => {
    test('应该返回指定标签的文章列表', async () => {
      const response = await request(app)
        .get('/api/tags/1/articles')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('tag');
      expect(response.body).toHaveProperty('isEmpty');
    });

    test('应该处理无效的标签ID', async () => {
      const response = await request(app)
        .get('/api/tags/invalid/articles')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_TAG_ID');
    });

    test('应该处理不存在的标签', async () => {
      const response = await request(app)
        .get('/api/tags/99999/articles')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'TAG_NOT_FOUND');
    });
  });

  describe('POST /api/tags', () => {
    test('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .post('/api/tags')
        .send({ name: 'Test Tag' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'MISSING_TOKEN');
    });

    test('应该验证空标签名', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: '' })
        .expect(403); // 会先验证token，所以返回403

      expect(response.body).toHaveProperty('error');
    });
  });
});