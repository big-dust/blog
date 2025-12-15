import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ArticleList from '../components/ArticleList';
import EmptyState from '../components/EmptyState';
import categoryService from '../services/categoryService';
import './CategoryPage.css';

function CategoryPage() {
  const { id } = useParams();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await categoryService.getCategory(id);
        setCategory(response.data);
      } catch (err) {
        console.error('Failed to fetch category:', err);
        setError('分类加载失败');
        setCategory(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCategory();
    }
  }, [id]);

  if (loading) return <div className="loading">加载中...</div>;
  
  if (error) {
    return (
      <div className="category-page">
        <div className="category-container">
          <EmptyState message={error} icon="❌" />
        </div>
      </div>
    );
  }
  
  if (!category) {
    return (
      <div className="category-page">
        <div className="category-container">
          <EmptyState message="分类未找到" icon="🔍" />
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="category-container">
        <div className="category-header">
          <h1>分类: {category.name}</h1>
          {category.description && (
            <p className="category-description">{category.description}</p>
          )}
        </div>
        <ArticleList categoryId={id} />
      </div>
    </div>
  );
}

export default CategoryPage;