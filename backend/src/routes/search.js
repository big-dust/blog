const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// 生成摘要（截取内容前200字）
function makeSummary(content, maxLen = 200) {
  if (!content) return '';
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen) + '...';
}

// 搜索文章
router.get('/', async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: '请输入搜索关键词' });
    }

    const keyword = q.trim().toLowerCase();  // 转小写
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const likeKeyword = `%${keyword}%`;

    // LIKE 模糊搜索
    const sql = `
      SELECT a.id, a.title, a.content, a.summary, a.view_count, a.created_at,
        c.name as category_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE LOWER(a.title) LIKE ? OR LOWER(a.content) LIKE ?
      ORDER BY a.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const countSql = `
      SELECT COUNT(*) as total FROM articles a
      WHERE LOWER(a.title) LIKE ? OR LOWER(a.content) LIKE ?
    `;

    // 执行查询
    const articles = await db.query(sql, [likeKeyword, likeKeyword]);
    const countResult = await db.query(countSql, [likeKeyword, likeKeyword]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // 处理结果
    const result = articles.map(a => ({
      id: a.id,
      title: a.title,
      summary: a.summary || makeSummary(a.content),
      view_count: a.view_count,
      created_at: a.created_at,
      category_name: a.category_name
    }));

    res.json({
      success: true,
      data: {
        articles: result,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (e) {
    console.log('搜索出错:', e.message);
    res.status(500).json({ error: '搜索失败' });
  }
});

module.exports = router;
