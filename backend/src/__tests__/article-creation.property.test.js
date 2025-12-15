// 确保在测试开始前加载环境变量
require('dotenv').config();

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { db, initDatabase } = require('../config/database');
const articlesRoutes = require('../routes/articles');
const { generateToken } = require('../middleware/auth');

/**
 * **Feature: personal-blog, Property 6: 文章创建完整性**
 * **Validates: Requirements 2.1**
 * 
 * 对于任何有效的文章数据，创建后应当在数据库中存在且在前台可见
 */

describe('Property Test: Article Creation Integrity', () => {
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
      username: 'testuser_' + Date.now(),
      email: 'test_' + Date.now() + '@example.com',
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
    
    // 关闭数据库连接
    if (db && db.end) {
      await db.end();
    }
  });

  // 生成有效的文章数据
  const validArticleArbitrary = fc.record({
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    content: fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0),
    summary: fc.option(fc.string({ maxLength: 500 }), { nil: null })
  });

  test('Property: Article creation integrity - created articles exist in database and are visible', async () => {
    await fc.assert(
      fc.asyncProperty(validArticleArbitrary, async (articleData) => {
        // 创建文章
        const createResponse = await request(app)
          .post('/api/articles')
          .set('Authorization', `Bearer ${authToken}`)
          .send(articleData)
          .expect(201);

        expect(createResponse.body.success).toBe(true);
        expect(createResponse.body.data).toBeDefined();
        
        const createdArticle = createResponse.body.data;
        const articleId = createdArticle.id;

        // 验证文章在数据库中存在
        const dbResult = await db.query(
          'SELECT * FROM articles WHERE id = ?',
          [articleId]
        );
        
        expect(dbResult.length).toBe(1);
        const dbArticle = dbResult[0];
        
        // 验证数据库中的数据与创建的数据一致
        expect(dbArticle.title).toBe(articleData.title.trim());
        expect(dbArticle.content).toBe(articleData.content.trim());
        expect(dbArticle.summary).toBe(articleData.summary ? articleData.summary.trim() : null);
        expect(dbArticle.author_id).toBe(testUserId);

        // 验证文章在前台可见 (通过API获取)
        const getResponse = await request(app)
          .get(`/api/articles/${articleId}`)
          .expect(200);

        expect(getResponse.body.success).toBe(true);
        expect(getResponse.body.data).toBeDefined();
        
        const retrievedArticle = getResponse.body.data;
        expect(retrievedArticle.id).toBe(articleId);
        expect(retrievedArticle.title).toBe(articleData.title.trim());
        expect(retrievedArticle.content).toBe(articleData.content.trim());
        expect(retrievedArticle.summary).toBe(articleData.summary ? articleData.summary.trim() : null);

        // 验证文章出现在文章列表中
        const listResponse = await request(app)
          .get('/api/articles')
          .expect(200);

        expect(listResponse.body.success).toBe(true);
        expect(listResponse.body.data).toBeDefined();
        
        const articleInList = listResponse.body.data.find(a => a.id === articleId);
        expect(articleInList).toBeDefined();
        expect(articleInList.title).toBe(articleData.title.trim());

        // 清理：删除创建的文章
        await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
      }),
      { numRuns: 100 }
    );
  });

  test('Property: Empty or whitespace-only content should be rejected', async () => {
    const invalidArticleArbitrary = fc.record({
      title: fc.oneof(
        fc.constant(''),
        fc.string().filter(s => s.trim().length === 0)
      ),
      content: fc.oneof(
        fc.constant(''),
        fc.string().filter(s => s.trim().length === 0)
      )
    });

    await fc.assert(
      fc.asyncProperty(invalidArticleArbitrary, async (articleData) => {
        // 尝试创建无效文章
        const response = await request(app)
          .post('/api/articles')
          .set('Authorization', `Bearer ${authToken}`)
          .send(articleData);

        // 应该返回400错误
        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('VALIDATION_ERROR');

        // 验证文章没有被创建到数据库中
        const dbResult = await db.query(
          'SELECT COUNT(*) as count FROM articles WHERE title = ? AND content = ? AND author_id = ?',
          [articleData.title, articleData.content, testUserId]
        );
        
        expect(dbResult[0].count).toBe(0);
      }),
      { numRuns: 50 }
    );
  });
});