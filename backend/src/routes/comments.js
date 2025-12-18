const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// 回复评论
router.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, email, content } = req.body;

    if (!nickname || !email || !content) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    if (!nickname.trim() || !email.trim() || !content.trim()) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    // 一个正常表达式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: '邮箱格式不对' });
    }

    // 检查父评论
    const parent = await db.query('SELECT id, article_id FROM comments WHERE id = ?', [id]);
    if (parent.length === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }

    const articleId = parent[0].article_id;

    // 检查文章
    const article = await db.query('SELECT id FROM articles WHERE id = ?', [articleId]);
    if (article.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 插入回复
    const result = await db.query(
      'INSERT INTO comments (article_id, parent_id, nickname, email, content) VALUES (?, ?, ?, ?, ?)',
      [articleId, id, nickname.trim(), email.trim(), content.trim()]
    );

    const created = await db.query(
      'SELECT id, article_id, parent_id, nickname, email, content, created_at FROM comments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, data: created[0], message: '回复成功' });
  } catch (e) {
    console.log('回复失败:', e.message);
    res.status(500).json({ error: '回复失败' });
  }
});

module.exports = router;
