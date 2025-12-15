const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const DatabaseUtils = require('../utils/database');
const router = express.Router();

// 获取文章列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category_id, tag_id, author_id } = req.query;

    let sql = `
      SELECT 
        a.id, a.title, a.summary, a.view_count, a.created_at, a.updated_at,
        u.username as author_name,
        c.name as category_name, c.id as category_id,
        GROUP_CONCAT(DISTINCT t.name) as tags,
        GROUP_CONCAT(DISTINCT t.id) as tag_ids
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
    `;

    const params = [];
    const conditions = [];

    if (category_id) {
      conditions.push('a.category_id = ?');
      params.push(category_id);
    }
    if (tag_id) {
      conditions.push('at.tag_id = ?');
      params.push(tag_id);
    }
    if (author_id) {
      conditions.push('a.author_id = ?');
      params.push(author_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' GROUP BY a.id ORDER BY a.created_at DESC';

    const result = await DatabaseUtils.paginate(sql, params, parseInt(page), parseInt(limit));

    // 处理tags
    result.data = result.data.map(article => ({
      ...article,
      tags: article.tags ? article.tags.split(',') : [],
      tag_ids: article.tag_ids ? article.tag_ids.split(',').map(id => parseInt(id)) : []
    }));

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (e) {
    console.log('获取文章列表失败:', e.message);
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 获取单篇文章
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        a.id, a.title, a.content, a.summary, a.view_count, a.created_at, a.updated_at,
        u.username as author_name, u.id as author_id,
        c.name as category_name, c.id as category_id,
        GROUP_CONCAT(DISTINCT t.name) as tags,
        GROUP_CONCAT(DISTINCT t.id) as tag_ids
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = ?
      GROUP BY a.id
    `;
    const result = await db.query(sql, [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const article = result[0];
    article.tags = article.tags ? article.tags.split(',') : [];
    article.tag_ids = article.tag_ids ? article.tag_ids.split(',').map(id => parseInt(id)) : [];

    res.json({ success: true, data: article });
  } catch (e) {
    console.log('获取文章失败:', e.message);
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 创建文章
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, summary, category_id, tag_ids } = req.body;
    const author_id = req.user.id;

    // 验证
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    if (!title.trim() || !content.trim()) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const result = await db.transaction(async (conn) => {
      const [insertResult] = await conn.execute(
        'INSERT INTO articles (title, content, summary, author_id, category_id) VALUES (?, ?, ?, ?, ?)',
        [title.trim(), content.trim(), summary ? summary.trim() : null, author_id, category_id || null]
      );
      const articleId = insertResult.insertId;

      // 添加标签
      if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
        for (const tagId of tag_ids) {
          await conn.execute('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)', [articleId, tagId]);
        }
      }
      return articleId;
    });

    // 查询创建的文章
    const created = await db.query(`
      SELECT a.id, a.title, a.content, a.summary, a.view_count, a.created_at, a.updated_at,
        u.username as author_name, c.name as category_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.id = ?
    `, [result]);

    res.status(201).json({ success: true, data: created[0], message: '创建成功' });
  } catch (e) {
    console.log('创建文章失败:', e.message);
    res.status(500).json({ error: '创建失败' });
  }
});

// 更新文章
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, summary, category_id, tag_ids } = req.body;
    const userId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    if (!title.trim() || !content.trim()) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    // 检查权限
    const existing = await db.query('SELECT * FROM articles WHERE id = ? AND author_id = ?', [id, userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '文章不存在或无权限' });
    }

    await db.transaction(async (conn) => {
      await conn.execute(
        'UPDATE articles SET title = ?, content = ?, summary = ?, category_id = ? WHERE id = ?',
        [title.trim(), content.trim(), summary ? summary.trim() : null, category_id || null, id]
      );

      // 更新标签
      if (tag_ids !== undefined) {
        await conn.execute('DELETE FROM article_tags WHERE article_id = ?', [id]);
        if (Array.isArray(tag_ids) && tag_ids.length > 0) {
          for (const tagId of tag_ids) {
            await conn.execute('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)', [id, tagId]);
          }
        }
      }
    });

    // 查询更新后的文章
    const updated = await db.query(`
      SELECT a.id, a.title, a.content, a.summary, a.view_count, a.created_at, a.updated_at,
        u.username as author_name, c.name as category_name,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = ?
      GROUP BY a.id
    `, [id]);

    const article = updated[0];
    article.tags = article.tags ? article.tags.split(',') : [];

    res.json({ success: true, data: article, message: '更新成功' });
  } catch (e) {
    console.log('更新文章失败:', e.message);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除文章
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await db.query('SELECT * FROM articles WHERE id = ? AND author_id = ?', [id, userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '文章不存在或无权限' });
    }

    const deleted = await db.transaction(async (conn) => {
      await conn.execute('DELETE FROM article_tags WHERE article_id = ?', [id]);
      await conn.execute('DELETE FROM comments WHERE article_id = ?', [id]);
      const [result] = await conn.execute('DELETE FROM articles WHERE id = ?', [id]);
      return result.affectedRows;
    });

    if (deleted > 0) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ error: '文章不存在' });
    }
  } catch (e) {
    console.log('删除文章失败:', e.message);
    res.status(500).json({ error: '删除失败' });
  }
});

// 增加浏览量
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT id, view_count FROM articles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    await db.query('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [id]);
    const updated = await db.query('SELECT view_count FROM articles WHERE id = ?', [id]);

    res.json({
      success: true,
      data: { article_id: parseInt(id), view_count: updated[0].view_count },
      message: '浏览量+1'
    });
  } catch (e) {
    console.log('更新浏览量失败:', e.message);
    res.status(500).json({ error: '更新失败' });
  }
});

// 获取文章评论
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    const article = await db.query('SELECT id FROM articles WHERE id = ?', [id]);
    if (article.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const comments = await db.query(`
      SELECT id, article_id, parent_id, nickname, email, content, created_at 
      FROM comments WHERE article_id = ? ORDER BY created_at ASC
    `, [id]);

    // 构建嵌套结构
    const map = new Map();
    const rootComments = [];

    comments.forEach(c => {
      map.set(c.id, { ...c, replies: [] });
    });

    comments.forEach(c => {
      const obj = map.get(c.id);
      if (c.parent_id) {
        const parent = map.get(c.parent_id);
        if (parent) parent.replies.push(obj);
      } else {
        rootComments.push(obj);
      }
    });

    res.json({ success: true, data: rootComments, total: comments.length });
  } catch (e) {
    console.log('获取评论失败:', e.message);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// 添加评论
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, email, content } = req.body;

    if (!nickname || !email || !content) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    if (!nickname.trim() || !email.trim() || !content.trim()) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    // 简单验证邮箱
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: '邮箱格式不对' });
    }

    const article = await db.query('SELECT id FROM articles WHERE id = ?', [id]);
    if (article.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const result = await db.query(
      'INSERT INTO comments (article_id, nickname, email, content) VALUES (?, ?, ?, ?)',
      [id, nickname.trim(), email.trim(), content.trim()]
    );

    const created = await db.query(
      'SELECT id, article_id, parent_id, nickname, email, content, created_at FROM comments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, data: created[0], message: '评论成功' });
  } catch (e) {
    console.log('创建评论失败:', e.message);
    res.status(500).json({ error: '评论失败' });
  }
});

module.exports = router;
