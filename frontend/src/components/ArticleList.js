import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from './EmptyState';
import articleService from '../services/articleService';
import './ArticleList.css';

function ArticleList({ categoryId, tagId, searchQuery }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: 10
      };

      if (categoryId) params.categoryId = categoryId;
      if (tagId) params.tagId = tagId;
      if (searchQuery) params.search = searchQuery;

      const response = await articleService.getArticles(params);
      
      setArticles(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCount(response.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      setError('加载文章失败，请稍后重试');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [categoryId, tagId, searchQuery, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [categoryId, tagId, searchQuery]);

  if (loading) return <div className="loading">加载中...</div>;

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={fetchArticles} className="retry-button">
          重试
        </button>
      </div>
    );
  }

  if (articles.length === 0) {
    let emptyMessage = "暂无文章";
    if (searchQuery) {
      emptyMessage = `未找到包含 "${searchQuery}" 的文章`;
    } else if (categoryId) {
      emptyMessage = "该分类下暂无文章";
    } else if (tagId) {
      emptyMessage = "该标签下暂无文章";
    }
    return <EmptyState message={emptyMessage} />;
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
                <Link 
                  to={`/category/${article.category_id}`} 
                  className="category-link"
                >
                  {article.category_name}
                </Link>
              )}
              <div className="article-tags">
                {article.tags && article.tags.map((tagName, index) => (
                  <Link
                    key={index}
                    to={`/tag/${article.tag_ids ? article.tag_ids[index] : index}`}
                    className="tag-link"
                  >
                    {tagName}
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      
      {/* Show pagination when there are more than 10 articles (requirement 7.2) */}
      {totalCount > 10 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="pagination-button"
          >
            上一页
          </button>
          <span className="pagination-info">
            第 {currentPage} 页，共 {totalPages} 页 (共 {totalCount} 篇文章)
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
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