const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const DatabaseUtils = require('../utils/database');
const router = express.Router();

// 获取文章列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category_id, 
      tag_id, 
      author_id 
    } = req.query;

    // 构建基础查询
    let baseQuery = `
      SELECT 
        a.id,
        a.title,
        a.summary,
        a.view_count,
        a.created_at,
        a.updated_at,
        u.username as author_name,
        c.name as category_name,
        c.id as category_id,
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

    // 添加筛选条件
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
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    baseQuery += ' GROUP BY a.id ORDER BY a.created_at DESC';

    // 执行分页查询
    const result = await DatabaseUtils.paginate(
      baseQuery, 
      params, 
      parseInt(page), 
      parseInt(limit)
    );

    // 处理标签数据
    result.data = result.data.map(article => ({
      ...article,
      tags: article.tags ? article.tags.split(',') : [],
      tag_ids: article.tag_ids ? article.tag_ids.split(',').map(id => parseInt(id)) : []
    }));

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ARTICLES_FAILED',
        message: '获取文章列表失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 获取单篇文章
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        a.id,
        a.title,
        a.content,
        a.summary,
        a.view_count,
        a.created_at,
        a.updated_at,
        u.username as author_name,
        u.id as author_id,
        c.name as category_name,
        c.id as category_id,
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

    const result = await db.query(query, [id]);

    if (result.length === 0) {
      return res.status(404).json({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: '文章不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    const article = result[0];
    
    // 处理标签数据
    article.tags = article.tags ? article.tags.split(',') : [];
    article.tag_ids = article.tag_ids ? article.tag_ids.split(',').map(id => parseInt(id)) : [];

    res.json({
      success: true,
      data: article
    });

  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ARTICLE_FAILED',
        message: '获取文章失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 创建文章 (需要认证)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, summary, category_id, tag_ids } = req.body;
    const author_id = req.user.id;

    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '标题和内容不能为空',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 验证内容不能只包含空白字符
    if (!title.trim() || !content.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '标题和内容不能为空或只包含空白字符',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 使用事务
    const result = await db.transaction(async (connection) => {
      // 插入文章
      const articleData = {
        title: title.trim(),
        content: content.trim(),
        summary: summary ? summary.trim() : null,
        author_id,
        category_id: category_id || null
      };

      const [insertResult] = await connection.execute(
        'INSERT INTO articles (title, content, summary, author_id, category_id) VALUES (?, ?, ?, ?, ?)',
        [articleData.title, articleData.content, articleData.summary, articleData.author_id, articleData.category_id]
      );
      
      const articleId = insertResult.insertId;

      // 处理标签关联
      if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
        for (const tagId of tag_ids) {
          await connection.execute(
            'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)',
            [articleId, tagId]
          );
        }
      }

      return articleId;
    });

    // 获取创建的文章详情
    const createdArticle = await db.query(`
      SELECT 
        a.id,
        a.title,
        a.content,
        a.summary,
        a.view_count,
        a.created_at,
        a.updated_at,
        u.username as author_name,
        c.name as category_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.id = ?
    `, [result]);

    res.status(201).json({
      success: true,
      data: createdArticle[0],
      message: '文章创建成功'
    });

  } catch (error) {
    console.error('创建文章失败:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_ARTICLE_FAILED',
        message: '创建文章失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 更新文章 (需要认证)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, summary, category_id, tag_ids } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '标题和内容不能为空',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 验证内容不能只包含空白字符
    if (!title.trim() || !content.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '标题和内容不能为空或只包含空白字符',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查文章是否存在且属于当前用户
    const existingArticle = await db.query(
      'SELECT * FROM articles WHERE id = ? AND author_id = ?',
      [id, userId]
    );

    if (existingArticle.length === 0) {
      return res.status(404).json({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: '文章不存在或无权限修改',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 使用事务
    await db.transaction(async (connection) => {
      // 更新文章 (保持原有的 created_at)
      await connection.execute(
        'UPDATE articles SET title = ?, content = ?, summary = ?, category_id = ? WHERE id = ?',
        [title.trim(), content.trim(), summary ? summary.trim() : null, category_id || null, id]
      );

      // 更新标签关联
      if (tag_ids !== undefined) {
        // 删除现有标签关联
        await connection.execute('DELETE FROM article_tags WHERE article_id = ?', [id]);

        // 添加新的标签关联
        if (Array.isArray(tag_ids) && tag_ids.length > 0) {
          for (const tagId of tag_ids) {
            await connection.execute(
              'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)',
              [id, tagId]
            );
          }
        }
      }
    });

    // 获取更新后的文章详情
    const updatedArticle = await db.query(`
      SELECT 
        a.id,
        a.title,
        a.content,
        a.summary,
        a.view_count,
        a.created_at,
        a.updated_at,
        u.username as author_name,
        c.name as category_name,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = ?
      GROUP BY a.id
    `, [id]);

    const article = updatedArticle[0];
    article.tags = article.tags ? article.tags.split(',') : [];

    res.json({
      success: true,
      data: article,
      message: '文章更新成功'
    });

  } catch (error) {
    console.error('更新文章失败:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_ARTICLE_FAILED',
        message: '更新文章失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 删除文章 (需要认证)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查文章是否存在且属于当前用户
    const existingArticle = await db.query(
      'SELECT * FROM articles WHERE id = ? AND author_id = ?',
      [id, userId]
    );

    if (existingArticle.length === 0) {
      return res.status(404).json({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: '文章不存在或无权限删除',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 使用事务删除文章及相关数据
    const deletedRows = await db.transaction(async (connection) => {
      // 删除文章标签关联
      await connection.execute('DELETE FROM article_tags WHERE article_id = ?', [id]);

      // 删除文章评论
      await connection.execute('DELETE FROM comments WHERE article_id = ?', [id]);

      // 删除文章
      const [result] = await connection.execute('DELETE FROM articles WHERE id = ?', [id]);
      return result.affectedRows;
    });

    if (deletedRows > 0) {
      res.json({
        success: true,
        message: '文章删除成功'
      });
    } else {
      res.status(404).json({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: '文章不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('删除文章失败:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_ARTICLE_FAILED',
        message: '删除文章失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 增加文章浏览次数
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查文章是否存在
    const existingArticle = await db.query(
      'SELECT id, view_count FROM articles WHERE id = ?',
      [id]
    );

    if (existingArticle.length === 0) {
      return res.status(404).json({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: '文章不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 增加浏览次数
    await db.query(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );

    // 获取更新后的浏览次数
    const updatedArticle = await db.query(
      'SELECT view_count FROM articles WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        article_id: parseInt(id),
        view_count: updatedArticle[0].view_count
      },
      message: '浏览次数已更新'
    });

  } catch (error) {
    console.error('更新浏览次数失败:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_VIEW_COUNT_FAILED',
        message: '更新浏览次数失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 获取文章评论
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查文章是否存在
    const article = await db.query('SELECT id FROM articles WHERE id = ?', [id]);
    if (article.length === 0) {
      return res.status(404).json({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: '文章不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 获取所有评论，按时间排序
    const comments = await db.query(`
      SELECT id, article_id, parent_id, nickname, email, content, created_at 
      FROM comments 
      WHERE article_id = ? 
      ORDER BY created_at ASC
    `, [id]);

    // 构建嵌套评论结构
    const commentMap = new Map();
    const rootComments = [];

    // 首先创建所有评论对象
    comments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment,
        replies: []
      });
    });

    // 然后建立父子关系
    comments.forEach(comment => {
      const commentObj = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentObj);
        }
      } else {
        rootComments.push(commentObj);
      }
    });

    res.json({
      success: true,
      data: rootComments,
      total: comments.length
    });

  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({
      error: {
        code: 'GET_COMMENTS_FAILED',
        message: '获取评论失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 添加文章评论
router.post('/:id/comments', async (req, res) => {
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

    // 检查文章是否存在
    const article = await db.query('SELECT id FROM articles WHERE id = ?', [id]);
    if (article.length === 0) {
      return res.status(404).json({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: '文章不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 插入评论
    const result = await db.query(
      'INSERT INTO comments (article_id, nickname, email, content) VALUES (?, ?, ?, ?)',
      [id, nickname.trim(), email.trim(), content.trim()]
    );

    // 获取创建的评论详情
    const createdComment = await db.query(
      'SELECT id, article_id, parent_id, nickname, email, content, created_at FROM comments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: createdComment[0],
      message: '评论创建成功'
    });

  } catch (error) {
    console.error('创建评论失败:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_COMMENT_FAILED',
        message: '创建评论失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;