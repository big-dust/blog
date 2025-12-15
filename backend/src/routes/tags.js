const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const DatabaseUtils = require('../utils/database');
const router = express.Router();

// 获取所有标签
router.get('/', async (req, res) => {
  try {
    const tags = await db.query('SELECT * FROM tags ORDER BY name ASC');
    
    res.json({
      success: true,
      data: tags,
      count: tags.length
    });
  } catch (error) {
    console.error('获取标签列表失败:', error);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取标签列表失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 获取标签云数据
router.get('/cloud', async (req, res) => {
  try {
    // 获取标签及其使用次数
    const tagCloudData = await db.query(`
      SELECT 
        t.id,
        t.name,
        t.color,
        COUNT(at.article_id) as count
      FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      LEFT JOIN articles a ON at.article_id = a.id
      GROUP BY t.id, t.name, t.color
      HAVING count > 0
      ORDER BY count DESC, t.name ASC
    `);

    // 计算权重 (基于使用频率)
    const maxUsage = tagCloudData.length > 0 ? Math.max(...tagCloudData.map(tag => tag.count)) : 1;
    const minUsage = tagCloudData.length > 0 ? Math.min(...tagCloudData.map(tag => tag.count)) : 1;
    
    const tagsWithWeight = tagCloudData.map(tag => ({
      ...tag,
      weight: maxUsage === minUsage ? 1 : (tag.count - minUsage) / (maxUsage - minUsage)
    }));

    res.json({
      success: true,
      data: tagsWithWeight,
      count: tagsWithWeight.length,
      stats: {
        maxUsage,
        minUsage,
        totalTags: tagsWithWeight.length
      }
    });
  } catch (error) {
    console.error('获取标签云数据失败:', error);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取标签云数据失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 获取单个标签信息
router.get('/:id', async (req, res) => {
  try {
    const tagId = parseInt(req.params.id);

    if (isNaN(tagId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TAG_ID',
          message: '无效的标签ID',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 获取标签信息
    const tag = await db.query('SELECT * FROM tags WHERE id = ?', [tagId]);
    
    if (tag.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TAG_NOT_FOUND',
          message: '标签不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: tag[0]
    });
  } catch (error) {
    console.error('获取标签失败:', error);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取标签失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 根据标签ID获取文章列表
router.get('/:id/articles', async (req, res) => {
  try {
    const tagId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(tagId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TAG_ID',
          message: '无效的标签ID',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查标签是否存在
    const tagExists = await db.query('SELECT id, name FROM tags WHERE id = ?', [tagId]);
    if (tagExists.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TAG_NOT_FOUND',
          message: '标签不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 获取该标签下的文章
    const baseQuery = `
      SELECT DISTINCT
        a.id,
        a.title,
        a.summary,
        a.view_count,
        a.created_at,
        a.updated_at,
        u.username as author_name,
        c.name as category_name
      FROM articles a
      INNER JOIN article_tags at ON a.id = at.article_id
      INNER JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE at.tag_id = ?
      ORDER BY a.created_at DESC
    `;

    const result = await DatabaseUtils.paginate(baseQuery, [tagId], page, limit);

    // 为每篇文章获取标签
    for (let article of result.data) {
      const articleTags = await db.query(`
        SELECT t.id, t.name, t.color
        FROM tags t
        INNER JOIN article_tags at ON t.id = at.tag_id
        WHERE at.article_id = ?
        ORDER BY t.name ASC
      `, [article.id]);
      article.tags = articleTags;
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      tag: tagExists[0],
      isEmpty: result.data.length === 0
    });
  } catch (error) {
    console.error('获取标签文章列表失败:', error);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取标签文章列表失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 创建新标签 (需要认证)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, color = '#007bff' } = req.body;

    // 验证输入
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '标签名称不能为空',
          details: { field: 'name' },
          timestamp: new Date().toISOString()
        }
      });
    }

    const trimmedName = name.trim();
    
    // 验证颜色格式 (简单的十六进制颜色验证)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(color)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '颜色格式无效，请使用十六进制格式 (如: #007bff)',
          details: { field: 'color' },
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查标签是否已存在
    const existingTag = await db.query('SELECT id FROM tags WHERE name = ?', [trimmedName]);
    if (existingTag.length > 0) {
      return res.status(409).json({
        error: {
          code: 'TAG_EXISTS',
          message: '标签已存在',
          details: { field: 'name' },
          timestamp: new Date().toISOString()
        }
      });
    }

    // 创建标签
    const tagId = await DatabaseUtils.insert('tags', {
      name: trimmedName,
      color: color
    });

    // 获取创建的标签
    const newTag = await db.query('SELECT * FROM tags WHERE id = ?', [tagId]);

    res.status(201).json({
      success: true,
      data: newTag[0],
      message: '标签创建成功'
    });
  } catch (error) {
    console.error('创建标签失败:', error);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '创建标签失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 更新标签 (需要认证)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tagId = parseInt(req.params.id);
    const { name, color } = req.body;

    if (isNaN(tagId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TAG_ID',
          message: '无效的标签ID',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查标签是否存在
    const existingTag = await db.query('SELECT * FROM tags WHERE id = ?', [tagId]);
    if (existingTag.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TAG_NOT_FOUND',
          message: '标签不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    const updateData = {};
    
    // 验证并更新名称
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '标签名称不能为空',
            details: { field: 'name' },
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const trimmedName = name.trim();
      
      // 检查名称是否与其他标签冲突
      const nameConflict = await db.query('SELECT id FROM tags WHERE name = ? AND id != ?', [trimmedName, tagId]);
      if (nameConflict.length > 0) {
        return res.status(409).json({
          error: {
            code: 'TAG_EXISTS',
            message: '标签名称已存在',
            details: { field: 'name' },
            timestamp: new Date().toISOString()
          }
        });
      }
      
      updateData.name = trimmedName;
    }

    // 验证并更新颜色
    if (color !== undefined) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!colorRegex.test(color)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '颜色格式无效，请使用十六进制格式 (如: #007bff)',
            details: { field: 'color' },
            timestamp: new Date().toISOString()
          }
        });
      }
      updateData.color = color;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATE_DATA',
          message: '没有提供要更新的数据',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 更新标签
    await DatabaseUtils.update('tags', updateData, { id: tagId });

    // 获取更新后的标签
    const updatedTag = await db.query('SELECT * FROM tags WHERE id = ?', [tagId]);

    res.json({
      success: true,
      data: updatedTag[0],
      message: '标签更新成功'
    });
  } catch (error) {
    console.error('更新标签失败:', error);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '更新标签失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 删除标签 (需要认证)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tagId = parseInt(req.params.id);

    if (isNaN(tagId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TAG_ID',
          message: '无效的标签ID',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查标签是否存在
    const existingTag = await db.query('SELECT * FROM tags WHERE id = ?', [tagId]);
    if (existingTag.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TAG_NOT_FOUND',
          message: '标签不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 删除标签 (级联删除会自动处理 article_tags 关联)
    await DatabaseUtils.delete('tags', { id: tagId });

    res.json({
      success: true,
      message: '标签删除成功',
      data: existingTag[0]
    });
  } catch (error) {
    console.error('删除标签失败:', error);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '删除标签失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;