import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ArticleList from '../components/ArticleList';
import EmptyState from '../components/EmptyState';
import tagService from '../services/tagService';
import './TagPage.css';

function TagPage() {
  const { id } = useParams();
  const [tag, setTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTag = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await tagService.getTag(id);
        setTag(response.data);
      } catch (err) {
        console.error('Failed to fetch tag:', err);
        setError('标签加载失败');
        setTag(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTag();
    }
  }, [id]);

  if (loading) return <div className="loading">加载中...</div>;
  
  if (error) {
    return (
      <div className="tag-page">
        <div className="tag-container">
          <EmptyState message={error} icon="❌" />
        </div>
      </div>
    );
  }
  
  if (!tag) {
    return (
      <div className="tag-page">
        <div className="tag-container">
          <EmptyState message="标签未找到" icon="🔍" />
        </div>
      </div>
    );
  }

  return (
    <div className="tag-page">
      <div className="tag-container">
        <div className="tag-header">
          <h1>
            标签: 
            <span className="tag-badge" style={{ backgroundColor: tag.color || '#007bff' }}>
              {tag.name}
            </span>
          </h1>
        </div>
        <ArticleList tagId={id} />
      </div>
    </div>
  );
}

export default TagPage;