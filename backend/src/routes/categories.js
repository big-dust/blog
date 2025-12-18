const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const DatabaseUtils = require('../utils/database');

const router = express.Router();

// 获取所有分类
router.get('/', async (req, res) => {
  try {
    const categories = await db.query(`
      SELECT c.id, c.name, c.description, c.created_at, COUNT(a.id) as count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      GROUP BY c.id, c.name, c.description, c.created_at
      ORDER BY c.name ASC
    `);

    res.json({ success: true, data: categories, count: categories.length });
  } catch (e) {
    console.log('获取分类失败:', e.message);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 获取单个分类
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID格式不对' });
    }

    const categories = await db.query(`
      SELECT c.id, c.name, c.description, c.created_at, COUNT(a.id) as count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      WHERE c.id = ?
      GROUP BY c.id, c.name, c.description, c.created_at
    `, [id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }

    res.json({ success: true, data: categories[0] });
  } catch (e) {
    console.log('获取分类详情失败:', e.message);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取分类下的文章
router.get('/:id/articles', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID格式不对' });
    }

    // 先检查分类存不存在
    const cat = await db.query('SELECT id, name FROM categories WHERE id = ?', [id]);
    if (cat.length === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const sql = `
      SELECT a.id, a.title, a.summary, a.view_count, a.created_at, a.updated_at,
        u.username as author_name, c.name as category_name
      FROM articles a
      JOIN users u ON a.author_id = u.id
      JOIN categories c ON a.category_id = c.id
      WHERE a.category_id = ?
      ORDER BY a.created_at DESC
    `;

    const result = await DatabaseUtils.paginate(sql, [id], page, limit);

    if (result.data.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: result.pagination,
        category: cat[0],
        empty_state: { message: `分类"${cat[0].name}"下暂无文章` }
      });
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      category: cat[0]
    });
  } catch (e) {
    console.log('获取分类文章失败:', e.message);
    res.status(500).json({ error: '获取失败' });
  }
});

// 创建分类
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '名称不能为空' });
    }
    if (name.trim().length > 50) {
      return res.status(400).json({ error: '名称太长了' });
    }

    // 检查重名
    const existing = await db.query('SELECT id FROM categories WHERE name = ?', [name.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: '分类已存在' });
    }

    const id = await DatabaseUtils.insert('categories', {
      name: name.trim(),
      description: description ? description.trim() : null
    });

    const newCat = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: newCat[0], message: '创建成功' });
  } catch (e) {
    console.log('创建分类失败:', e.message);
    res.status(500).json({ error: '创建失败' });
  }
});

// 更新分类
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Id格式不对' });
    }
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '名称不能为空' });
    }
    if (name.trim().length > 50) {
      return res.status(400).json({ error: '名称太长了' });
    }

    const existing = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 检查重名
    const conflict = await db.query('SELECT id FROM categories WHERE name = ? AND id != ?', [name.trim(), id]);
    if (conflict.length > 0) {
      return res.status(409).json({ error: '名称已被使用' });
    }

    await DatabaseUtils.update('categories', {
      name: name.trim(),
      description: description ? description.trim() : null
    }, { id });

    const updated = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0], message: '更新成功' });
  } catch (e) {
    console.log('更新分类失败:', e.message);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除分类
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID格式不对' });
    }

    const existing = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 看看有多少文章用了这个分类
    const articles = await db.query('SELECT COUNT(*) as count FROM articles WHERE category_id = ?', [id]);
    const count = articles[0].count;

    await DatabaseUtils.delete('categories', { id });

    res.json({
      success: true,
      message: '删除成功',
      affected_articles: count > 0 ? `${count}篇文章的分类已清空` : '无影响'
    });
  } catch (e) {
    console.log('删除分类失败:', e.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
