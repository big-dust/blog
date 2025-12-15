import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import categoryService from '../services/categoryService';
import EmptyState from './EmptyState';
import './CategoryList.css';

function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await categoryService.getCategories();
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('分类加载失败');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) return <div className="loading">加载中...</div>;
  
  if (error) {
    return <EmptyState message={error} icon="❌" />;
  }

  if (categories.length === 0) {
    return <EmptyState message="暂无分类" icon="📁" />;
  }

  return (
    <ul className="category-list">
      {categories.map(category => (
        <li key={category.id} className="category-item">
          <Link to={`/category/${category.id}`} className="category-link">
            <span className="category-name">{category.name}</span>
            <span className="category-count">({category.count || 0})</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default CategoryList;