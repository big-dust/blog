const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const DatabaseUtils = require('../utils/database');

const router = express.Router();

/**
 * 获取所有分类
 * GET /api/categories
 */
router.get('/', async (req, res) => {
  try {
    const categories = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        COUNT(a.id) as count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      GROUP BY c.id, c.name, c.description, c.created_at
      ORDER BY c.name ASC
    `);

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('获取分类列表失败:', error.message);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取分类列表失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 根据ID获取单个分类
 * GET /api/categories/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: '分类ID必须是数字',
          timestamp: new Date().toISOString()
        }
      });
    }

    const categories = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        COUNT(a.id) as count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      WHERE c.id = ?
      GROUP BY c.id, c.name, c.description, c.created_at
    `, [categoryId]);

    if (categories.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: '分类不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: categories[0]
    });
  } catch (error) {
    console.error('获取分类详情失败:', error.message);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取分类详情失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 获取分类下的文章列表
 * GET /api/categories/:id/articles
 */
router.get('/:id/articles', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: '分类ID必须是数字',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 首先检查分类是否存在
    const categoryCheck = await db.query('SELECT id, name FROM categories WHERE id = ?', [categoryId]);
    if (categoryCheck.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: '分类不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 获取该分类下的文章
    const baseQuery = `
      SELECT 
        a.id,
        a.title,
        a.summary,
        a.view_count,
        a.created_at,
        a.updated_at,
        u.username as author_name,
        c.name as category_name
      FROM articles a
      JOIN users u ON a.author_id = u.id
      JOIN categories c ON a.category_id = c.id
      WHERE a.category_id = ?
      ORDER BY a.created_at DESC
    `;

    const result = await DatabaseUtils.paginate(baseQuery, [categoryId], page, limit);

    // 如果没有文章，返回空状态信息
    if (result.data.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: result.pagination,
        category: categoryCheck[0],
        empty_state: {
          message: `分类"${categoryCheck[0].name}"下暂无文章`,
          suggestion: '请查看其他分类或等待新文章发布'
        }
      });
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      category: categoryCheck[0]
    });
  } catch (error) {
    console.error('获取分类文章列表失败:', error.message);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取分类文章列表失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 创建新分类 (需要认证)
 * POST /api/categories
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    // 验证输入
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '分类名称不能为空',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '分类名称不能超过50个字符',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查分类名是否已存在
    const existingCategory = await db.query('SELECT id FROM categories WHERE name = ?', [name.trim()]);
    if (existingCategory.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CATEGORY_EXISTS',
          message: '分类名称已存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 创建分类
    const categoryId = await DatabaseUtils.insert('categories', {
      name: name.trim(),
      description: description ? description.trim() : null
    });

    // 获取创建的分类信息
    const newCategory = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);

    res.status(201).json({
      success: true,
      data: newCategory[0],
      message: '分类创建成功'
    });
  } catch (error) {
    console.error('创建分类失败:', error.message);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '创建分类失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 更新分类 (需要认证)
 * PUT /api/categories/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name, description } = req.body;

    if (isNaN(categoryId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: '分类ID必须是数字',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 验证输入
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '分类名称不能为空',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '分类名称不能超过50个字符',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查分类是否存在
    const existingCategory = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (existingCategory.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: '分类不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查新名称是否与其他分类冲突
    const nameConflict = await db.query('SELECT id FROM categories WHERE name = ? AND id != ?', [name.trim(), categoryId]);
    if (nameConflict.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CATEGORY_EXISTS',
          message: '分类名称已存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 更新分类
    const affectedRows = await DatabaseUtils.update('categories', {
      name: name.trim(),
      description: description ? description.trim() : null
    }, { id: categoryId });

    if (affectedRows === 0) {
      return res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: '分类更新失败',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 获取更新后的分类信息
    const updatedCategory = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);

    res.json({
      success: true,
      data: updatedCategory[0],
      message: '分类更新成功'
    });
  } catch (error) {
    console.error('更新分类失败:', error.message);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '更新分类失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 删除分类 (需要认证)
 * DELETE /api/categories/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: '分类ID必须是数字',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查分类是否存在
    const existingCategory = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (existingCategory.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: '分类不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查是否有文章使用此分类
    const articlesInCategory = await db.query('SELECT COUNT(*) as count FROM articles WHERE category_id = ?', [categoryId]);
    const articleCount = articlesInCategory[0].count;

    // 删除分类（根据外键约束，相关文章的category_id会被设置为NULL）
    const affectedRows = await DatabaseUtils.delete('categories', { id: categoryId });

    if (affectedRows === 0) {
      return res.status(500).json({
        error: {
          code: 'DELETE_FAILED',
          message: '分类删除失败',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: '分类删除成功',
      affected_articles: articleCount > 0 ? `${articleCount}篇文章的分类已被清空` : '无文章受影响'
    });
  } catch (error) {
    console.error('删除分类失败:', error.message);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '删除分类失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;