const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// 回复评论
router.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, email, content } = req.body;

    // 验证必填字段
    if (!nickname || !email || !content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '昵称、邮箱和评论内容不能为空',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 验证内容不能只包含空白字符
    if (!nickname.trim() || !email.trim() || !content.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '昵称、邮箱和评论内容不能为空或只包含空白字符',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '邮箱格式不正确',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查父评论是否存在
    const parentComment = await db.query(
      'SELECT id, article_id FROM comments WHERE id = ?',
      [id]
    );

    if (parentComment.length === 0) {
      return res.status(404).json({
        error: {
          code: 'COMMENT_NOT_FOUND',
          message: '父评论不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    const articleId = parentComment[0].article_id;

    // 检查文章是否存在
    const article = await db.query('SELECT id FROM articles WHERE id = ?', [articleId]);
    if (article.length === 0) {
      return res.status(404).json({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: '文章不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 插入回复评论
    const result = await db.query(
      'INSERT INTO comments (article_id, parent_id, nickname, email, content) VALUES (?, ?, ?, ?, ?)',
      [articleId, id, nickname.trim(), email.trim(), content.trim()]
    );

    // 获取创建的回复评论详情
    const createdReply = await db.query(
      'SELECT id, article_id, parent_id, nickname, email, content, created_at FROM comments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: createdReply[0],
      message: '回复评论成功'
    });

  } catch (error) {
    console.error('回复评论失败:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_REPLY_FAILED',
        message: '回复评论失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;