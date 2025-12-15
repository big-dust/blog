import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from './EmptyState';
import articleService from '../services/articleService';
import './ArticleList.css';

function ArticleList({ categoryId, tagId, searchQuery }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { page, limit: 10 };
      if (categoryId) params.categoryId = categoryId;
      if (tagId) params.tagId = tagId;
      if (searchQuery) params.search = searchQuery;

      const res = await articleService.getArticles(params);
      setArticles(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      console.log('加载文章失败:', e);
      setError('加载失败');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [categoryId, tagId, searchQuery, page]);

  // 筛选条件变了就回到第一页
  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [categoryId, tagId, searchQuery]);

  if (loading) return <div className="loading">加载中...</div>;

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={fetchArticles} className="retry-button">重试</button>
      </div>
    );
  }

  if (articles.length === 0) {
    let msg = "暂无文章";
    if (searchQuery) msg = `没找到 "${searchQuery}" 相关的文章`;
    else if (categoryId) msg = "该分类下暂无文章";
    else if (tagId) msg = "该标签下暂无文章";
    return <EmptyState message={msg} />;
  }

  return (
    <div className="article-list">
      <div className="articles">
        {articles.map(article => (
          <article key={article.id} className="article-card">
            <h2 className="article-title">
              <Link to={`/article/${article.id}`}>{article.title}</Link>
            </h2>
            <div className="article-meta">
              <span className="article-date">
                {new Date(article.created_at).toLocaleDateString('zh-CN')}
              </span>
              <span className="article-views">浏览: {article.view_count || 0}</span>
            </div>
            <p className="article-summary">{article.summary}</p>
            <div className="article-footer">
              {article.category_name && (
                <Link to={`/category/${article.category_id}`} className="category-link">
                  {article.category_name}
                </Link>
              )}
              <div className="article-tags">
                {article.tags && article.tags.map((tag, i) => (
                  <Link
                    key={i}
                    to={`/tag/${article.tag_ids ? article.tag_ids[i] : i}`}
                    className="tag-link"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* 分页 */}
      {total > 10 && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="pagination-button"
          >
            上一页
          </button>
          <span className="pagination-info">
            第 {page} 页，共 {totalPages} 页 (共 {total} 篇)
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="pagination-button"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

export default ArticleList;
