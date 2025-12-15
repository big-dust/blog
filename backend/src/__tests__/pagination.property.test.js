// 确保在测试开始前加载环境变量
require('dotenv').config();

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { db, initDatabase } = require('../config/database');
const articlesRoutes = require('../routes/articles');
const { generateToken } = require('../middleware/auth');

/**
 * **Feature: personal-blog, Property 22: 分页触发准确性**
 * **Validates: Requirements 7.2**
 * 
 * 对于任何超过 10 篇文章的列表，系统应当自动启用分页功能
 */

describe('Property Test: Pagination Trigger Accuracy', () => {
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
      username: 'testuser_pagination_' + Date.now(),
      email: 'test_pagination_' + Date.now() + '@example.com',
      password_hash: 'hashed_password'
    };

    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [testUser.username, testUser.email, testUser.password_hash]
    );
    
    testUserId = result.insertId;
    authToken = generateToken({ id: testUserId, username: testUser.username });
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
    title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    content: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    summary: fc.option(fc.string({ maxLength: 50 }), { nil: null })
  });

  test('Property: Pagination triggers correctly when articles exceed limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 11, max: 25 }), // 文章数量超过10
        async (articleCount) => {
          const createdArticleIds = [];

          try {
            // 创建指定数量的文章
            for (let i = 0; i < articleCount; i++) {
              const articleData = {
                title: `Test Article ${i + 1}`,
                content: `Content for article ${i + 1}`,
                summary: `Summary ${i + 1}`
              };

              const createResponse = await request(app)
                .post('/api/articles')
                .set('Authorization', `Bearer ${authToken}`)
                .send(articleData)
                .expect(201);

              createdArticleIds.push(createResponse.body.data.id);
            }

            // 测试默认分页 (limit=10)
            const defaultResponse = await request(app)
              .get('/api/articles')
              .expect(200);

            expect(defaultResponse.body.success).toBe(true);
            expect(defaultResponse.body.data).toBeDefined();
            expect(defaultResponse.body.pagination).toBeDefined();

            const pagination = defaultResponse.body.pagination;
            
            // 验证分页信息
            expect(pagination.total).toBe(articleCount);
            expect(pagination.limit).toBe(10);
            expect(pagination.page).toBe(1);
            expect(pagination.totalPages).toBe(Math.ceil(articleCount / 10));
            expect(pagination.hasNext).toBe(articleCount > 10);
            expect(pagination.hasPrev).toBe(false);

            // 验证返回的文章数量不超过10
            expect(defaultResponse.body.data.length).toBeLessThanOrEqual(10);
            expect(defaultResponse.body.data.length).toBe(Math.min(10, articleCount));

            // 测试第二页 (如果存在)
            if (articleCount > 10) {
              const page2Response = await request(app)
                .get('/api/articles?page=2')
                .expect(200);

              expect(page2Response.body.success).toBe(true);
              expect(page2Response.body.pagination.page).toBe(2);
              expect(page2Response.body.pagination.hasPrev).toBe(true);
              
              const expectedPage2Count = Math.min(10, articleCount - 10);
              expect(page2Response.body.data.length).toBe(expectedPage2Count);
            }

            // 测试自定义分页大小
            const customLimitResponse = await request(app)
              .get(`/api/articles?limit=5`)
              .expect(200);

            expect(customLimitResponse.body.pagination.limit).toBe(5);
            expect(customLimitResponse.body.data.length).toBeLessThanOrEqual(5);
            expect(customLimitResponse.body.pagination.totalPages).toBe(Math.ceil(articleCount / 5));

          } finally {
            // 清理：删除所有创建的文章
            for (const articleId of createdArticleIds) {
              await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  test('Property: No pagination needed when articles are 10 or fewer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // 文章数量不超过10
        async (articleCount) => {
          const createdArticleIds = [];

          try {
            // 创建指定数量的文章
            for (let i = 0; i < articleCount; i++) {
              const articleData = {
                title: `Small Test Article ${i + 1}`,
                content: `Content for small article ${i + 1}`,
                summary: `Small Summary ${i + 1}`
              };

              const createResponse = await request(app)
                .post('/api/articles')
                .set('Authorization', `Bearer ${authToken}`)
                .send(articleData)
                .expect(201);

              createdArticleIds.push(createResponse.body.data.id);
            }

            // 获取文章列表
            const response = await request(app)
              .get('/api/articles')
              .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.pagination).toBeDefined();

            const pagination = response.body.pagination;
            
            // 验证分页信息
            expect(pagination.total).toBe(articleCount);
            expect(pagination.limit).toBe(10);
            expect(pagination.page).toBe(1);
            expect(pagination.totalPages).toBe(1); // 只有一页
            expect(pagination.hasNext).toBe(false); // 没有下一页
            expect(pagination.hasPrev).toBe(false); // 没有上一页

            // 验证返回的文章数量等于创建的数量
            expect(response.body.data.length).toBe(articleCount);

          } finally {
            // 清理：删除所有创建的文章
            for (const articleId of createdArticleIds) {
              await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 20000);

  test('Property: Pagination parameters work correctly across different limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 15, max: 30 }), // 文章数量
        fc.integer({ min: 3, max: 8 }), // 自定义分页大小
        async (articleCount, customLimit) => {
          const createdArticleIds = [];

          try {
            // 创建指定数量的文章
            for (let i = 0; i < articleCount; i++) {
              const articleData = {
                title: `Limit Test Article ${i + 1}`,
                content: `Content for limit test article ${i + 1}`,
                summary: null
              };

              const createResponse = await request(app)
                .post('/api/articles')
                .set('Authorization', `Bearer ${authToken}`)
                .send(articleData)
                .expect(201);

              createdArticleIds.push(createResponse.body.data.id);
            }

            // 测试自定义分页大小
            const response = await request(app)
              .get(`/api/articles?limit=${customLimit}`)
              .expect(200);

            expect(response.body.success).toBe(true);
            const pagination = response.body.pagination;
            
            // 验证分页计算正确
            expect(pagination.total).toBe(articleCount);
            expect(pagination.limit).toBe(customLimit);
            expect(pagination.totalPages).toBe(Math.ceil(articleCount / customLimit));
            expect(pagination.hasNext).toBe(articleCount > customLimit);
            
            // 验证返回的文章数量
            const expectedFirstPageCount = Math.min(customLimit, articleCount);
            expect(response.body.data.length).toBe(expectedFirstPageCount);

            // 测试最后一页
            const lastPage = Math.ceil(articleCount / customLimit);
            if (lastPage > 1) {
              const lastPageResponse = await request(app)
                .get(`/api/articles?limit=${customLimit}&page=${lastPage}`)
                .expect(200);

              const expectedLastPageCount = articleCount - (lastPage - 1) * customLimit;
              expect(lastPageResponse.body.data.length).toBe(expectedLastPageCount);
              expect(lastPageResponse.body.pagination.hasNext).toBe(false);
            }

          } finally {
            // 清理：删除所有创建的文章
            for (const articleId of createdArticleIds) {
              await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
            }
          }
        }
      ),
      { numRuns: 8 }
    );
  }, 25000);
});