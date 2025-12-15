const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

/**
 * 高亮搜索关键词
 * @param {string} text 原始文本
 * @param {string} keyword 搜索关键词
 * @returns {string} 高亮后的文本
 */
function highlightKeywords(text, keyword) {
  if (!text || !keyword) return text;
  
  // 转义特殊字符以避免正则表达式错误
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // 创建全局不区分大小写的正则表达式
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  
  // 使用 <mark> 标签高亮关键词
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * 生成搜索摘要
 * @param {string} content 文章内容
 * @param {string} keyword 搜索关键词
 * @param {number} maxLength 最大长度
 * @returns {string} 搜索摘要
 */
function generateSearchSummary(content, keyword, maxLength = 200) {
  if (!content || !keyword) return content ? content.substring(0, maxLength) + '...' : '';
  
  // 查找关键词在内容中的位置
  const lowerContent = content.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const keywordIndex = lowerContent.indexOf(lowerKeyword);
  
  if (keywordIndex === -1) {
    // 如果没找到关键词，返回开头部分
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  
  // 计算摘要的开始和结束位置
  const halfLength = Math.floor(maxLength / 2);
  let start = Math.max(0, keywordIndex - halfLength);
  let end = Math.min(content.length, start + maxLength);
  
  // 调整开始位置以确保摘要长度
  if (end - start < maxLength) {
    start = Math.max(0, end - maxLength);
  }
  
  let summary = content.substring(start, end);
  
  // 添加省略号
  if (start > 0) summary = '...' + summary;
  if (end < content.length) summary = summary + '...';
  
  return summary;
}

// 全文搜索文章
router.get('/', async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    // 验证搜索关键词
    if (!q || q.trim() === '') {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR',
          message: '搜索关键词不能为空' 
        }
      });
    }
    
    const keyword = q.trim();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // 使用混合搜索策略：FULLTEXT + LIKE 搜索
    // 首先尝试 FULLTEXT 搜索，然后补充 LIKE 搜索以支持部分匹配
    const searchQuery = `
      SELECT 
        a.id,
        a.title,
        a.content,
        a.summary,
        a.view_count,
        a.created_at,
        a.updated_at,
        c.name as category_name,
        u.username as author_name,
        CASE 
          WHEN MATCH(a.title, a.content) AGAINST(? IN NATURAL LANGUAGE MODE) > 0 
          THEN MATCH(a.title, a.content) AGAINST(? IN NATURAL LANGUAGE MODE)
          ELSE 0.1
        END as relevance_score
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE MATCH(a.title, a.content) AGAINST(? IN NATURAL LANGUAGE MODE)
         OR a.title LIKE ? 
         OR a.content LIKE ?
      ORDER BY relevance_score DESC, a.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    // 获取搜索结果总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM articles a
      WHERE MATCH(a.title, a.content) AGAINST(? IN NATURAL LANGUAGE MODE)
         OR a.title LIKE ? 
         OR a.content LIKE ?
    `;
    
    // 准备搜索参数
    const likeKeyword = `%${keyword}%`;
    
    // 执行查询
    const [articles, countResult] = await Promise.all([
      db.query(searchQuery, [keyword, keyword, keyword, likeKeyword, likeKeyword]),
      db.query(countQuery, [keyword, likeKeyword, likeKeyword])
    ]);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);
    
    // 处理搜索结果，添加高亮和摘要
    const processedArticles = articles.map(article => {
      // 生成搜索摘要
      const summary = generateSearchSummary(article.content, keyword, 200);
      
      return {
        id: article.id,
        title: highlightKeywords(article.title, keyword),
        summary: highlightKeywords(summary, keyword),
        view_count: article.view_count,
        created_at: article.created_at,
        updated_at: article.updated_at,
        category_name: article.category_name,
        author_name: article.author_name,
        relevance_score: article.relevance_score
      };
    });
    
    // 返回搜索结果
    res.json({
      success: true,
      data: {
        articles: processedArticles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        search: {
          keyword,
          resultsCount: total,
          executionTime: Date.now() // 简单的执行时间标记
        }
      }
    });
    
  } catch (error) {
    console.error('搜索文章时出错:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_ERROR',
        message: '搜索服务暂时不可用，请稍后重试',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;