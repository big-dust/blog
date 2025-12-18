import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import tagService from '../services/tagService';
import EmptyState from './EmptyState';
import './TagCloud.css';

function TagCloud() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 根据使用频率计算权重
  const calcWeight = (count, max) => {
    if (max === 0) return 1;
    const ratio = count / max;
    if (ratio >= 0.8) return 5;
    if (ratio >= 0.6) return 4;
    if (ratio >= 0.4) return 3;
    if (ratio >= 0.2) return 2;
    return 1;
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await tagService.getTagCloud();
        const data = res.data || [];
        const max = Math.max(...data.map(t => t.count || 0));
        setTags(data.map(t => ({ ...t, weight: calcWeight(t.count || 0, max) })));
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
  if (tags.length === 0) return <EmptyState message="暂无标签" icon="🏷️" />;

  return (
    <div className="tag-cloud">
      {tags.map(t => (
        <Link
          key={t.id}
          to={`/tag/${t.id}`}
          className={`tag-cloud-item weight-${t.weight}`}
          style={{ backgroundColor: '#007bff' }}
          title={`${t.name} (${t.count || 0} 篇)`}
        >
          {t.name} ({t.count || 0})
        </Link>
      ))}
    </div>
  );
}

export default TagCloud;
