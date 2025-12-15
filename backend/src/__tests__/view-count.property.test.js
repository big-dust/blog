// 确保在测试开始前加载环境变量
require('dotenv').config();

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { db, initDatabase } = require('../config/database');
const articlesRoutes = require('../routes/articles');
const { generateToken } = require('../middleware/auth');

/**
 * **Feature: personal-blog, Property 4: 浏览计数准确性**
 * **Validates: Requirements 1.4**
 * 
 * 对于任何文章，每次访问应当使浏览次数精确增加 1
 */

describe('Property Test: View Count Accuracy', () => {
  let app;
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // 初始化数据库连接
    await initDatabase();
    
    // 创建测试应用
    app = express();
    app.use(express.json());
    app.use('/api/articles', articlesRoutes);

    // 创建测试用户并获取认证令牌
    const testUser = {
      username: 'testuser_view_' + Date.now(),
      email: 'test_view_' + Date.now() + '@example.com',
      password_hash: 'hashed_password'
    };

    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [testUser.username, testUser.email, testUser.password_hash]
    );
    
    testUserId = result.insertId;
    authToken = generateToken({ id: testUserId, username: testUser.username });
    
    // 验证用户创建成功
    const userCheck = await db.query('SELECT id FROM users WHERE id = ?', [testUserId]);
    if (userCheck.length === 0) {
      throw new Error('Test user creation failed');
    }
  });

  afterAll(async () => {
    // 清理测试数据
    if (testUserId) {
      await db.query('DELETE FROM articles WHERE author_id = ?', [testUserId]);
      await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
    }
  });

  // 生成有效的文章数据
  const validArticleArbitrary = fc.record({
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    content: fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0),
    summary: fc.option(fc.string({ maxLength: 500 }), { nil: null })
  });

  test('Property: Each view increments count by exactly 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        validArticleArbitrary,
        fc.integer({ min: 1, max: 5 }), // 浏览次数
        async (articleData, viewCount) => {
          // 创建文章
          const createResponse = await request(app)
            .post('/api/articles')
            .set('Authorization', `Bearer ${authToken}`)
            .send(articleData)
            .expect(201);

          const createdArticle = createResponse.body.data;
          const articleId = createdArticle.id;

          // 验证初始浏览次数为 0
          expect(createdArticle.view_count).toBe(0);

          // 执行多次浏览
          for (let i = 1; i <= viewCount; i++) {
            const viewResponse = await request(app)
              .post(`/api/articles/${articleId}/view`)
              .expect(200);

            expect(viewResponse.body.success).toBe(true);
            expect(viewResponse.body.data.view_count).toBe(i);
            expect(viewResponse.body.data.article_id).toBe(articleId);

            // 验证数据库中的浏览次数
            const dbResult = await db.query(
              'SELECT view_count FROM articles WHERE id = ?',
              [articleId]
            );
            
            expect(dbResult.length).toBe(1);
            expect(dbResult[0].view_count).toBe(i);
          }

          // 最终验证：获取文章详情确认浏览次数
          const getResponse = await request(app)
            .get(`/api/articles/${articleId}`)
            .expect(200);

          expect(getResponse.body.data.view_count).toBe(viewCount);

          // 清理：删除创建的文章
          await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
        }
      ),
      { numRuns: 20 }
    );
  }, 10000);

  test('Property: Sequential views increment count correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        validArticleArbitrary,
        fc.integer({ min: 2, max: 5 }), // 顺序请求数
        async (articleData, sequentialViews) => {
          // 创建文章
          const createResponse = await request(app)
            .post('/api/articles')
            .set('Authorization', `Bearer ${authToken}`)
            .send(articleData)
            .expect(201);

          const createdArticle = createResponse.body.data;
          const articleId = createdArticle.id;

          // 验证初始浏览次数为 0
          expect(createdArticle.view_count).toBe(0);

          // 顺序执行浏览请求，每次之间有小延迟
          for (let i = 1; i <= sequentialViews; i++) {
            const viewResponse = await request(app)
              .post(`/api/articles/${articleId}/view`)
              .expect(200);

            expect(viewResponse.body.success).toBe(true);
            expect(viewResponse.body.data.article_id).toBe(articleId);
            expect(viewResponse.body.data.view_count).toBe(i);

            // 小延迟避免并发问题
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // 验证最终浏览次数
          const dbResult = await db.query(
            'SELECT view_count FROM articles WHERE id = ?',
            [articleId]
          );
          
          expect(dbResult.length).toBe(1);
          expect(dbResult[0].view_count).toBe(sequentialViews);

          // 通过API再次验证
          const getResponse = await request(app)
            .get(`/api/articles/${articleId}`)
            .expect(200);

          expect(getResponse.body.data.view_count).toBe(sequentialViews);

          // 清理：删除创建的文章
          await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property: View count persists across article updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        validArticleArbitrary,
        validArticleArbitrary, // 更新数据
        fc.integer({ min: 1, max: 5 }), // 浏览次数
        async (originalData, updateData, viewCount) => {
          // 确保更新数据不同
          if (originalData.title === updateData.title) {
            updateData.title = updateData.title + '_updated';
          }

          // 创建文章
          const createResponse = await request(app)
            .post('/api/articles')
            .set('Authorization', `Bearer ${authToken}`)
            .send(originalData)
            .expect(201);

          const createdArticle = createResponse.body.data;
          const articleId = createdArticle.id;

          // 增加浏览次数
          for (let i = 0; i < viewCount; i++) {
            await request(app)
              .post(`/api/articles/${articleId}/view`)
              .expect(200);
          }

          // 验证浏览次数
          let getResponse = await request(app)
            .get(`/api/articles/${articleId}`)
            .expect(200);
          expect(getResponse.body.data.view_count).toBe(viewCount);

          // 更新文章
          await request(app)
            .put(`/api/articles/${articleId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData)
            .expect(200);

          // 验证更新后浏览次数保持不变
          getResponse = await request(app)
            .get(`/api/articles/${articleId}`)
            .expect(200);
          expect(getResponse.body.data.view_count).toBe(viewCount);

          // 验证数据库中的浏览次数
          const dbResult = await db.query(
            'SELECT view_count FROM articles WHERE id = ?',
            [articleId]
          );
          
          expect(dbResult.length).toBe(1);
          expect(dbResult[0].view_count).toBe(viewCount);

          // 清理：删除创建的文章
          await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('Property: View count for non-existent article returns 404', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 99999, max: 999999 }), // 不存在的文章ID
        async (nonExistentId) => {
          // 尝试为不存在的文章增加浏览次数
          const response = await request(app)
            .post(`/api/articles/${nonExistentId}/view`)
            .expect(404);

          expect(response.body.error).toBeDefined();
          expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
        }
      ),
      { numRuns: 10 }
    );
  });
});