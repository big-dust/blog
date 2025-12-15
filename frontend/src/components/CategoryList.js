import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import categoryService from '../services/categoryService';
import EmptyState from './EmptyState';
import './CategoryList.css';

function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await categoryService.getCategories();
        setCategories(res.data || []);
      } catch (e) {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <EmptyState message={error} icon="❌" />;
  if (categories.length === 0) return <EmptyState message="暂无分类" icon="📁" />;

  return (
    <ul className="category-list">
      {categories.map(c => (
        <li key={c.id} className="category-item">
          <Link to={`/category/${c.id}`} className="category-link">
            <span className="category-name">{c.name}</span>
            <span className="category-count">({c.count || 0})</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default CategoryList;
