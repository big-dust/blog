const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const DatabaseUtils = require('../utils/database');
const router = express.Router();

// 获取所有标签
router.get('/', async (req, res) => {
  try {
    const tags = await db.query('SELECT * FROM tags ORDER BY name ASC');
    res.json({ success: true, data: tags, count: tags.length });
  } catch (e) {
    console.log('获取标签失败:', e.message);
    res.status(500).json({ error: '获取标签失败' });
  }
});

// 标签云
router.get('/cloud', async (req, res) => {
  try {
    const data = await db.query(`
      SELECT t.id, t.name, t.color, COUNT(at.article_id) as count
      FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      LEFT JOIN articles a ON at.article_id = a.id
      GROUP BY t.id, t.name, t.color
      HAVING count > 0
      ORDER BY count DESC, t.name ASC
    `);

    // 计算权重
    const max = data.length > 0 ? Math.max(...data.map(t => t.count)) : 1;
    const min = data.length > 0 ? Math.min(...data.map(t => t.count)) : 1;

    const result = data.map(t => ({
      ...t,
      weight: max === min ? 1 : (t.count - min) / (max - min)
    }));

    res.json({
      success: true,
      data: result,
      count: result.length,
      stats: { maxUsage: max, minUsage: min, totalTags: result.length }
    });
  } catch (e) {
    console.log('获取标签云失败:', e.message);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取单个标签
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID格式不对' });
    }

    const tag = await db.query('SELECT * FROM tags WHERE id = ?', [id]);
    if (tag.length === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }

    res.json({ success: true, data: tag[0] });
  } catch (e) {
    console.log('获取标签失败:', e.message);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取标签下的文章
router.get('/:id/articles', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID格式不对' });
    }

    const tag = await db.query('SELECT id, name FROM tags WHERE id = ?', [id]);
    if (tag.length === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }

    const sql = `
      SELECT DISTINCT a.id, a.title, a.summary, a.view_count, a.created_at, a.updated_at,
        u.username as author_name, c.name as category_name
      FROM articles a
      INNER JOIN article_tags at ON a.id = at.article_id
      INNER JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE at.tag_id = ?
      ORDER BY a.created_at DESC
    `;

    const result = await DatabaseUtils.paginate(sql, [id], page, limit);

    // 给每篇文章加上标签
    for (let article of result.data) {
      const tags = await db.query(`
        SELECT t.id, t.name, t.color FROM tags t
        INNER JOIN article_tags at ON t.id = at.tag_id
        WHERE at.article_id = ? ORDER BY t.name ASC
      `, [article.id]);
      article.tags = tags;
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      tag: tag[0],
      isEmpty: result.data.length === 0
    });
  } catch (e) {
    console.log('获取标签文章失败:', e.message);
    res.status(500).json({ error: '获取失败' });
  }
});

// 创建标签
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, color = '#007bff' } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '名称不能为空' });
    }

    // 验证颜色格式
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(color)) {
      return res.status(400).json({ error: '颜色格式不对' });
    }

    const existing = await db.query('SELECT id FROM tags WHERE name = ?', [name.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: '标签已存在' });
    }

    const id = await DatabaseUtils.insert('tags', { name: name.trim(), color });
    const newTag = await db.query('SELECT * FROM tags WHERE id = ?', [id]);

    res.status(201).json({ success: true, data: newTag[0], message: '创建成功' });
  } catch (e) {
    console.log('创建标签失败:', e.message);
    res.status(500).json({ error: '创建失败' });
  }
});

// 更新标签
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, color } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID格式不对' });
    }

    const existing = await db.query('SELECT * FROM tags WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }

    const updateData = {};

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: '名称不能为空' });
      }
      // 检查重名
      const conflict = await db.query('SELECT id FROM tags WHERE name = ? AND id != ?', [name.trim(), id]);
      if (conflict.length > 0) {
        return res.status(409).json({ error: '名称已被使用' });
      }
      updateData.name = name.trim();
    }

    if (color !== undefined) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!colorRegex.test(color)) {
        return res.status(400).json({ error: '颜色格式不对' });
      }
      updateData.color = color;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: '没有要更新的数据' });
    }

    await DatabaseUtils.update('tags', updateData, { id });
    const updated = await db.query('SELECT * FROM tags WHERE id = ?', [id]);

    res.json({ success: true, data: updated[0], message: '更新成功' });
  } catch (e) {
    console.log('更新标签失败:', e.message);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除标签
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID格式不对' });
    }

    const existing = await db.query('SELECT * FROM tags WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }

    await DatabaseUtils.delete('tags', { id });
    res.json({ success: true, message: '删除成功', data: existing[0] });
  } catch (e) {
    console.log('删除标签失败:', e.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
