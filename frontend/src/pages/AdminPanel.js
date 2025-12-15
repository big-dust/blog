import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ArticleEditor from '../components/ArticleEditor';
import ArticleManager from '../components/ArticleManager';
import './AdminPanel.css';

function AdminPanel() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('editor');
  const [editingArticle, setEditingArticle] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      alert('请先登录');
    }
  }, [isAuthenticated, loading]);

  const handleEdit = (article) => {
    setEditingArticle(article);
    setActiveTab('editor');
  };

  const handleSave = () => {
    setEditingArticle(null);
    setActiveTab('manager');
  };

  const handleCancel = () => {
    setEditingArticle(null);
  };

  const handleNew = () => {
    setEditingArticle(null);
    setActiveTab('editor');
  };

  if (loading) return <div className="loading">加载中...</div>;

  if (!isAuthenticated) {
    return (
      <div className="admin-panel">
        <div className="admin-container">
          <div className="auth-required">
            <h2>需要登录</h2>
            <p>请先登录</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-container">
        <div className="admin-header">
          <h1>管理面板</h1>
          <div className="admin-tabs">
            <button
              className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              {editingArticle ? '编辑文章' : '新建文章'}
            </button>
            <button
              className={`tab-button ${activeTab === 'manager' ? 'active' : ''}`}
              onClick={() => setActiveTab('manager')}
            >
              文章管理
            </button>
          </div>
          {activeTab === 'manager' && (
            <button onClick={handleNew} className="new-article-button">新建文章</button>
          )}
        </div>
        <div className="admin-content">
          {activeTab === 'editor' && (
            <ArticleEditor
              editingArticle={editingArticle}
              onSave={handleSave}
              onCancel={editingArticle ? handleCancel : null}
            />
          )}
          {activeTab === 'manager' && (
            <ArticleManager onEditArticle={handleEdit} />
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
