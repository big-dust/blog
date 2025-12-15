const request = require('supertest');
const app = require('../server');
const { db } = require('../config/database');

describe('Comments API', () => {
  let testArticleId;
  let testCommentId;

  beforeAll(async () => {
    // 创建测试文章
    const result = await db.query(
      'INSERT INTO articles (title, content, author_id, category_id) VALUES (?, ?, ?, ?)',
      ['测试文章', '测试内容', 1, 1]
    );
    testArticleId = result.insertId;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testArticleId) {
      await db.query('DELETE FROM comments WHERE article_id = ?', [testArticleId]);
      await db.query('DELETE FROM articles WHERE id = ?', [testArticleId]);
    }
  });

  describe('POST /api/articles/:id/comments', () => {
    test('should create a new comment successfully', async () => {
      const commentData = {
        nickname: '测试用户',
        email: 'test@example.com',
        content: '这是一条测试评论'
      };

      const response = await request(app)
        .post(`/api/articles/${testArticleId}/comments`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nickname).toBe(commentData.nickname);
      expect(response.body.data.content).toBe(commentData.content);
      expect(response.body.data.article_id).toBe(testArticleId);

      testCommentId = response.body.data.id;
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/articles/${testArticleId}/comments`)
        .send({
          nickname: '',
          email: '',
          content: ''
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post(`/api/articles/${testArticleId}/comments`)
        .send({
          nickname: '测试用户',
          email: 'invalid-email',
          content: '测试内容'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('邮箱格式不正确');
    });

    test('should reject whitespace-only content', async () => {
      const response = await request(app)
        .post(`/api/articles/${testArticleId}/comments`)
        .send({
          nickname: '   ',
          email: 'test@example.com',
          content: '   '
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/articles/:id/comments', () => {
    test('should get comments for an article', async () => {
      const response = await request(app)
        .get(`/api/articles/${testArticleId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].nickname).toBe('测试用户');
    });

    test('should return empty array for article with no comments', async () => {
      // 创建一个新文章用于测试
      const articleResult = await db.query(
        'INSERT INTO articles (title, content, author_id, category_id) VALUES (?, ?, ?, ?)',
        ['空评论文章', '测试内容', 1, 1]
      );
      const emptyArticleId = articleResult.insertId;

      const response = await request(app)
        .get(`/api/articles/${emptyArticleId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);

      // 清理
      await db.query('DELETE FROM articles WHERE id = ?', [emptyArticleId]);
    });

    test('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .get('/api/articles/99999/comments')
        .expect(404);

      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });
  });

  describe('POST /api/comments/:id/reply', () => {
    test('should create a reply to existing comment', async () => {
      const replyData = {
        nickname: '回复用户',
        email: 'reply@example.com',
        content: '这是一条回复'
      };

      const response = await request(app)
        .post(`/api/comments/${testCommentId}/reply`)
        .send(replyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nickname).toBe(replyData.nickname);
      expect(response.body.data.content).toBe(replyData.content);
      expect(response.body.data.parent_id).toBe(testCommentId);
    });

    test('should return 404 for non-existent parent comment', async () => {
      const replyData = {
        nickname: '回复用户',
        email: 'reply@example.com',
        content: '这是一条回复'
      };

      const response = await request(app)
        .post('/api/comments/99999/reply')
        .send(replyData)
        .expect(404);

      expect(response.body.error.code).toBe('COMMENT_NOT_FOUND');
    });
  });

  describe('Nested comments structure', () => {
    test('should return comments with nested replies', async () => {
      const response = await request(app)
        .get(`/api/articles/${testArticleId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const comments = response.body.data;
      
      // 找到主评论
      const mainComment = comments.find(c => c.id === testCommentId);
      expect(mainComment).toBeDefined();
      expect(mainComment.replies).toBeDefined();
      expect(Array.isArray(mainComment.replies)).toBe(true);
      expect(mainComment.replies.length).toBeGreaterThan(0);
      
      // 验证回复的结构
      const reply = mainComment.replies[0];
      expect(reply.parent_id).toBe(testCommentId);
      expect(reply.nickname).toBe('回复用户');
    });
  });
});