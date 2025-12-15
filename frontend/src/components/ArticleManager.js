import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { articleService } from '../services';
import './ArticleManager.css';

function ArticleManager({ onEditArticle }) {
  const { isAuthenticated } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await articleService.getArticles({ limit: 100 }); // Get all articles for management
      setArticles(response.data || []);
    } catch (err) {
      setError('加载文章列表失败');
      console.error('Failed to load articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }

    if (window.confirm(`确定要删除文章"${title}"吗？此操作不可恢复。`)) {
      try {
        await articleService.deleteArticle(id);
        setArticles(prev => prev.filter(article => article.id !== id));
        alert('文章删除成功');
      } catch (err) {
        alert(`删除失败: ${err.message}`);
      }
    }
  };

  const handleEdit = async (article) => {
    if (!onEditArticle) return;
    
    try {
      setEditingId(article.id);
      // 获取完整的文章数据，包括内容
      const fullArticle = await articleService.getArticle(article.id);
      onEditArticle(fullArticle.data);
    } catch (err) {
      alert(`获取文章详情失败: ${err.message}`);
      console.error('Failed to load full article:', err);
    } finally {
      setEditingId(null);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  
  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={loadArticles} className="retry-button">重试</button>
      </div>
    );
  }

  return (
    <div className="article-manager">
      <div className="manager-header">
        <h2>文章管理</h2>
        <div className="header-actions">
          <button onClick={loadArticles} className="refresh-button">
            刷新
          </button>
        </div>
      </div>

      <div className="articles-table">
        <table>
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>标签</th>
              <th>浏览量</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  暂无文章
                </td>
              </tr>
            ) : (
              articles.map(article => (
                <tr key={article.id}>
                  <td>
                    <Link to={`/article/${article.id}`} className="article-title-link">
                      {article.title}
                    </Link>
                  </td>
                  <td>{article.category_name || '未分类'}</td>
                  <td>
                    <div className="article-tags">
                      {article.tags && article.tags.length > 0 ? (
                        article.tags.map((tagName, index) => (
                          <span 
                            key={article.tag_ids ? article.tag_ids[index] : index} 
                            className="tag-badge"
                            style={{ backgroundColor: '#007bff' }}
                          >
                            {tagName}
                          </span>
                        ))
                      ) : (
                        <span className="no-tags">无标签</span>
                      )}
                    </div>
                  </td>
                  <td>{article.view_count || 0}</td>
                  <td>{new Date(article.created_at).toLocaleDateString('zh-CN')}</td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() => handleEdit(article)}
                        className="edit-button"
                        disabled={editingId === article.id}
                      >
                        {editingId === article.id ? '加载中...' : '编辑'}
                      </button>
                      <button
                        onClick={() => handleDelete(article.id, article.title)}
                        className="delete-button"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ArticleManager;