import { useState, useEffect } from 'react';
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
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await categoryService.getCategory(id);
        setCategory(res.data);
      } catch (e) {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="category-page"><div className="category-container"><EmptyState message={error} icon="❌" /></div></div>;
  if (!category) return <div className="category-page"><div className="category-container"><EmptyState message="分类不存在" icon="🔍" /></div></div>;

  return (
    <div className="category-page">
      <div className="category-container">
        <div className="category-header">
          <h1>分类: {category.name}</h1>
          {category.description && <p className="category-description">{category.description}</p>}
        </div>
        <ArticleList categoryId={id} />
      </div>
    </div>
  );
}

export default CategoryPage;
