// 确保在测试开始前加载环境变量
require('dotenv').config();

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { db, initDatabase } = require('../config/database');
const articlesRoutes = require('../routes/articles');
const { generateToken } = require('../middleware/auth');

/**
 * **Feature: personal-blog, Property 7: 文章更新保持性**
 * **Validates: Requirements 2.2**
 * 
 * 对于任何文章更新操作，内容应当被修改但创建时间应当保持不变
 */

describe('Property Test: Article Update Persistence', () => {
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
      username: 'testuser_update_' + Date.now(),
      email: 'test_update_' + Date.now() + '@example.com',
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
    
    // 不要在测试中关闭数据库连接，让Jest处理
  });

  // 生成有效的文章数据
  const validArticleArbitrary = fc.record({
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    content: fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0),
    summary: fc.option(fc.string({ maxLength: 500 }), { nil: null })
  });

  // 生成更新数据 - 确保与原始数据不同
  const updateDataArbitrary = fc.record({
    title: fc.string({ minLength: 2, maxLength: 200 }).filter(s => s.trim().length > 1),
    content: fc.string({ minLength: 2, maxLength: 5000 }).filter(s => s.trim().length > 1),
    summary: fc.option(fc.string({ maxLength: 500 }), { nil: null })
  });

  test('Property: Article update preserves creation time but modifies content', async () => {
    await fc.assert(
      fc.asyncProperty(
        validArticleArbitrary, 
        updateDataArbitrary, 
        async (originalData, updateData) => {
          // 确保更新数据与原始数据不同
          if (originalData.title.trim() === updateData.title.trim() && 
              originalData.content.trim() === updateData.content.trim()) {
            updateData.title = updateData.title + '_updated';
          }

          // 创建原始文章
          const createResponse = await request(app)
            .post('/api/articles')
            .set('Authorization', `Bearer ${authToken}`)
            .send(originalData)
            .expect(201);

          const createdArticle = createResponse.body.data;
          const articleId = createdArticle.id;
          const originalCreatedAt = createdArticle.created_at;

          // 等待一小段时间确保 updated_at 会不同
          await new Promise(resolve => setTimeout(resolve, 100));

          // 更新文章
          const updateResponse = await request(app)
            .put(`/api/articles/${articleId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData)
            .expect(200);

          expect(updateResponse.body.success).toBe(true);
          const updatedArticle = updateResponse.body.data;

          // 验证内容已更新
          expect(updatedArticle.title).toBe(updateData.title.trim());
          expect(updatedArticle.content).toBe(updateData.content.trim());
          expect(updatedArticle.summary).toBe(updateData.summary ? updateData.summary.trim() : null);

          // 验证创建时间保持不变
          expect(updatedArticle.created_at).toBe(originalCreatedAt);

          // 验证数据库中的数据一致
          const dbResult = await db.query(
            'SELECT * FROM articles WHERE id = ?',
            [articleId]
          );
          
          expect(dbResult.length).toBe(1);
          const dbArticle = dbResult[0];
          
          expect(dbArticle.title).toBe(updateData.title.trim());
          expect(dbArticle.content).toBe(updateData.content.trim());
          expect(dbArticle.summary).toBe(updateData.summary ? updateData.summary.trim() : null);
          
          // 验证数据库中的创建时间保持不变
          expect(new Date(dbArticle.created_at).getTime()).toBe(
            new Date(originalCreatedAt).getTime()
          );

          // 清理：删除创建的文章
          await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
        }
      ),
      { numRuns: 20 }
    );
  }, 15000);

  test('Property: Multiple updates preserve original creation time', async () => {
    await fc.assert(
      fc.asyncProperty(
        validArticleArbitrary,
        fc.array(updateDataArbitrary, { minLength: 2, maxLength: 3 }),
        async (originalData, updateSequence) => {
          // 创建原始文章
          const createResponse = await request(app)
            .post('/api/articles')
            .set('Authorization', `Bearer ${authToken}`)
            .send(originalData)
            .expect(201);

          const createdArticle = createResponse.body.data;
          const articleId = createdArticle.id;
          const originalCreatedAt = createdArticle.created_at;

          // 执行多次更新
          let lastUpdatedAt = originalCreatedAt;
          
          for (const updateData of updateSequence) {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const updateResponse = await request(app)
              .put(`/api/articles/${articleId}`)
              .set('Authorization', `Bearer ${authToken}`)
              .send(updateData)
              .expect(200);

            const updatedArticle = updateResponse.body.data;

            // 验证创建时间始终保持不变
            expect(updatedArticle.created_at).toBe(originalCreatedAt);

            // 验证更新时间在递增
            expect(new Date(updatedArticle.updated_at).getTime()).toBeGreaterThanOrEqual(
              new Date(lastUpdatedAt).getTime()
            );

            lastUpdatedAt = updatedArticle.updated_at;
          }

          // 最终验证数据库状态
          const dbResult = await db.query(
            'SELECT * FROM articles WHERE id = ?',
            [articleId]
          );
          
          expect(dbResult.length).toBe(1);
          const dbArticle = dbResult[0];
          
          // 验证创建时间在数据库中保持不变
          expect(new Date(dbArticle.created_at).getTime()).toBe(
            new Date(originalCreatedAt).getTime()
          );

          // 验证最终内容是最后一次更新的内容
          const lastUpdate = updateSequence[updateSequence.length - 1];
          expect(dbArticle.title).toBe(lastUpdate.title.trim());
          expect(dbArticle.content).toBe(lastUpdate.content.trim());

          // 清理：删除创建的文章
          await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
        }
      ),
      { numRuns: 10 }
    );
  }, 20000);
});