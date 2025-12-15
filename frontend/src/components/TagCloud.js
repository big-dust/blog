import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import tagService from '../services/tagService';
import EmptyState from './EmptyState';
import './TagCloud.css';

function TagCloud() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate weight based on usage frequency (requirement 3.4)
  const calculateWeight = (count, maxCount) => {
    if (maxCount === 0) return 1;
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 5;
    if (ratio >= 0.6) return 4;
    if (ratio >= 0.4) return 3;
    if (ratio >= 0.2) return 2;
    return 1;
  };

  useEffect(() => {
    const fetchTagCloud = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await tagService.getTagCloud();
        const tagsData = response.data || [];
        
        // Calculate weights based on usage frequency
        const maxCount = Math.max(...tagsData.map(tag => tag.count || 0));
        const tagsWithWeights = tagsData.map(tag => ({
          ...tag,
          weight: calculateWeight(tag.count || 0, maxCount)
        }));
        
        setTags(tagsWithWeights);
      } catch (err) {
        console.error('Failed to fetch tag cloud:', err);
        setError('标签云加载失败');
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTagCloud();
  }, []);

  if (loading) return <div className="loading">加载中...</div>;
  
  if (error) {
    return <EmptyState message={error} icon="❌" />;
  }

  if (tags.length === 0) {
    return <EmptyState message="暂无标签" icon="🏷️" />;
  }

  return (
    <div className="tag-cloud">
      {tags.map(tag => (
        <Link
          key={tag.id}
          to={`/tag/${tag.id}`}
          className={`tag-cloud-item weight-${tag.weight}`}
          style={{ backgroundColor: tag.color || '#007bff' }}
          title={`${tag.name} (${tag.count || 0} 篇文章)`}
        >
          {tag.name} ({tag.count || 0})
        </Link>
      ))}
    </div>
  );
}

export default TagCloud;