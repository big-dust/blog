import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import articleService from '../services/articleService';
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
      const res = await articleService.getArticles({ limit: 100 });
      setArticles(res.data || []);
    } catch (e) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!isAuthenticated) { alert('请先登录'); return; }
    if (window.confirm(`确定删除"${title}"吗？`)) {
      try {
        await articleService.deleteArticle(id);
        setArticles(prev => prev.filter(a => a.id !== id));
        alert('删除成功');
      } catch (e) {
        alert('删除失败');
      }
    }
  };

  const handleEdit = async (article) => {
    if (!onEditArticle) return;
    try {
      setEditingId(article.id);
      const full = await articleService.getArticle(article.id);
      onEditArticle(full.data);
    } catch (e) {
      alert('获取文章失败');
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
        <button onClick={loadArticles} className="refresh-button">刷新</button>
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
              <tr><td colSpan="6" className="empty-state">暂无文章</td></tr>
            ) : (
              articles.map(a => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/article/${a.id}`} className="article-title-link">{a.title}</Link>
                  </td>
                  <td>{a.category_name || '未分类'}</td>
                  <td>
                    <div className="article-tags">
                      {a.tags && a.tags.length > 0 ? (
                        a.tags.map((tag, i) => (
                          <span key={i} className="tag-badge" style={{ backgroundColor: '#007bff' }}>{tag}</span>
                        ))
                      ) : (
                        <span className="no-tags">无</span>
                      )}
                    </div>
                  </td>
                  <td>{a.view_count || 0}</td>
                  <td>{new Date(a.created_at).toLocaleDateString('zh-CN')}</td>
                  <td>
                    <div className="actions">
                      <button onClick={() => handleEdit(a)} className="edit-button" disabled={editingId === a.id}>
                        {editingId === a.id ? '加载...' : '编辑'}
                      </button>
                      <button onClick={() => handleDelete(a.id, a.title)} className="delete-button">删除</button>
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
