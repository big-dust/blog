import { useState, useEffect } from 'react';
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
  const [page, setPage] = useState(1);

  const doSearch = async (p = 1) => {
    if (!query || query.trim() === '') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await searchService.searchArticles(query, { page: p, limit: 10 });
      setResults(res.articles || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(e.message || '搜索失败');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    doSearch(1);
  }, [query]);

  const handlePageChange = (p) => {
    setPage(p);
    doSearch(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!query || query.trim() === '') {
    return <div className="search-results"><div className="search-container"><EmptyState message="请输入关键词" /></div></div>;
  }
  if (loading) return <div className="loading">搜索中...</div>;
  if (error) {
    return (
      <div className="search-results">
        <div className="search-container">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => doSearch(page)} className="retry-button">重试</button>
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
          {pagination && pagination.total > 0 && <p className="results-count">找到 {pagination.total} 篇</p>}
        </div>

        {results.length > 0 ? (
          <>
            <div className="search-results-list">
              {results.map(a => (
                <article key={a.id} className="search-result-item">
                  <h2 className="result-title">
                    <Link to={`/article/${a.id}`} dangerouslySetInnerHTML={{ __html: a.title }} />
                  </h2>
                  <div className="result-meta">
                    <span className="result-date">{new Date(a.created_at).toLocaleDateString('zh-CN')}</span>
                    <span className="result-views">浏览: {a.view_count || 0}</span>
                    {a.category_name && <span className="result-category">{a.category_name}</span>}
                  </div>
                  <div className="result-summary" dangerouslySetInnerHTML={{ __html: a.summary }} />
                </article>
              ))}
            </div>

            {pagination && pagination.total > 10 && (
              <div className="pagination">
                <button disabled={!pagination.hasPrev} onClick={() => handlePageChange(page - 1)} className="pagination-button">上一页</button>
                <span className="pagination-info">第 {pagination.page} 页，共 {pagination.totalPages} 页</span>
                <button disabled={!pagination.hasNext} onClick={() => handlePageChange(page + 1)} className="pagination-button">下一页</button>
              </div>
            )}
          </>
        ) : (
          <EmptyState message="没找到相关文章" />
        )}
      </div>
    </div>
  );
}

export default SearchResults;
