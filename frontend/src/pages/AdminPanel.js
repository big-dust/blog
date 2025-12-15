import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ArticleEditor from '../components/ArticleEditor';
import ArticleManager from '../components/ArticleManager';
import './AdminPanel.css';

function AdminPanel() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('editor');
  const [editingArticle, setEditingArticle] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // In a real app, you'd redirect to login page
      alert('请先登录以访问管理面板');
    }
  }, [isAuthenticated, loading]);

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setActiveTab('editor');
  };

  const handleSaveArticle = (savedArticle) => {
    setEditingArticle(null);
    setActiveTab('manager');
  };

  const handleCancelEdit = () => {
    setEditingArticle(null);
  };

  const handleNewArticle = () => {
    setEditingArticle(null);
    setActiveTab('editor');
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-panel">
        <div className="admin-container">
          <div className="auth-required">
            <h2>需要登录</h2>
            <p>请先登录以访问管理面板</p>
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
            <button onClick={handleNewArticle} className="new-article-button">
              新建文章
            </button>
          )}
        </div>
        <div className="admin-content">
          {activeTab === 'editor' && (
            <ArticleEditor
              editingArticle={editingArticle}
              onSave={handleSaveArticle}
              onCancel={editingArticle ? handleCancelEdit : null}
            />
          )}
          {activeTab === 'manager' && (
            <ArticleManager onEditArticle={handleEditArticle} />
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;