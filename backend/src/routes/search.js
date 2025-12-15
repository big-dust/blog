const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// 高亮关键词
function highlight(text, keyword) {
  if (!text || !keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// 生成摘要
function makeSummary(content, keyword, maxLen = 200) {
  if (!content || !keyword) {
    return content ? content.substring(0, maxLen) + '...' : '';
  }

  const idx = content.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) {
    return content.substring(0, maxLen) + (content.length > maxLen ? '...' : '');
  }

  const half = Math.floor(maxLen / 2);
  let start = Math.max(0, idx - half);
  let end = Math.min(content.length, start + maxLen);
  if (end - start < maxLen) start = Math.max(0, end - maxLen);

  let summary = content.substring(start, end);
  if (start > 0) summary = '...' + summary;
  if (end < content.length) summary = summary + '...';

  return summary;
}

// 搜索文章
router.get('/', async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: '请输入搜索关键词' });
    }

    const keyword = q.trim();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const likeKeyword = `%${keyword}%`;

    // 搜索sql
    const sql = `
      SELECT a.id, a.title, a.content, a.summary, a.view_count, a.created_at, a.updated_at,
        c.name as category_name, u.username as author_name,
        CASE 
          WHEN MATCH(a.title, a.content) AGAINST(? IN NATURAL LANGUAGE MODE) > 0 
          THEN MATCH(a.title, a.content) AGAINST(? IN NATURAL LANGUAGE MODE)
          ELSE 0.1
        END as relevance_score
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE MATCH(a.title, a.content) AGAINST(? IN NATURAL LANGUAGE MODE)
         OR a.title LIKE ? OR a.content LIKE ?
      ORDER BY relevance_score DESC, a.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const countSql = `
      SELECT COUNT(*) as total FROM articles a
      WHERE MATCH(a.title, a.content) AGAINST(? IN NATURAL LANGUAGE MODE)
         OR a.title LIKE ? OR a.content LIKE ?
    `;

    const [articles, countResult] = await Promise.all([
      db.query(sql, [keyword, keyword, keyword, likeKeyword, likeKeyword]),
      db.query(countSql, [keyword, likeKeyword, likeKeyword])
    ]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // 处理结果
    const result = articles.map(a => ({
      id: a.id,
      title: highlight(a.title, keyword),
      summary: highlight(makeSummary(a.content, keyword, 200), keyword),
      view_count: a.view_count,
      created_at: a.created_at,
      updated_at: a.updated_at,
      category_name: a.category_name,
      author_name: a.author_name,
      relevance_score: a.relevance_score
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
        },
        search: { keyword, resultsCount: total }
      }
    });
  } catch (e) {
    console.log('搜索出错:', e.message);
    res.status(500).json({ error: '搜索失败' });
  }
});

module.exports = router;
