import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import searchService from '../services/searchService';
import './SearchResults.css';

function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSearchResults = async (page = 1) => {
    if (!query || query.trim() === '') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await searchService.searchArticles(query, { page, limit: 10 });
      
      setResults(response.articles || []);
      setPagination(response.pagination);
    } catch (err) {
      console.error('搜索失败:', err);
      setError(err.message || '搜索失败，请稍后重试');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchSearchResults(1);
  }, [query]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchSearchResults(page);
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 验证搜索关键词 (requirement 4.4)
  if (!query || query.trim() === '') {
    return (
      <div className="search-results">
        <div className="search-container">
          <EmptyState message="请输入搜索关键词" />
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading">搜索中...</div>;

  if (error) {
    return (
      <div className="search-results">
        <div className="search-container">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => fetchSearchResults(currentPage)} className="retry-button">
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="search-container">
        <div className="search-header">
          <h1>搜索结果</h1>
          <p>关键词: "{query}"</p>
          {pagination && pagination.total > 0 && (
            <p className="results-count">找到 {pagination.total} 篇文章</p>
          )}
        </div>
        
        {results.length > 0 ? (
          <>
            <div className="search-results-list">
              {results.map(article => (
                <article key={article.id} className="search-result-item">
                  <h2 className="result-title">
                    <Link 
                      to={`/article/${article.id}`}
                      dangerouslySetInnerHTML={{ __html: article.title }}
                    />
                  </h2>
                  <div className="result-meta">
                    <span className="result-date">
                      {new Date(article.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="result-views">浏览: {article.view_count || 0}</span>
                    {article.category_name && (
                      <span className="result-category">{article.category_name}</span>
                    )}
                  </div>
                  <div 
                    className="result-summary"
                    dangerouslySetInnerHTML={{ __html: article.summary }}
                  />
                </article>
              ))}
            </div>
            
            {/* 分页 - 当结果超过10篇时显示 (requirement 7.2) */}
            {pagination && pagination.total > 10 && (
              <div className="pagination">
                <button
                  disabled={!pagination.hasPrev}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="pagination-button"
                >
                  上一页
                </button>
                <span className="pagination-info">
                  第 {pagination.page} 页，共 {pagination.totalPages} 页 (共 {pagination.total} 篇文章)
                </span>
                <button
                  disabled={!pagination.hasNext}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="pagination-button"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState message="未找到相关文章，请尝试其他关键词" />
        )}
      </div>
    </div>
  );
}

export default SearchResults;