import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ArticleContent from '../components/ArticleContent';
import CommentSection from '../components/CommentSection';
import articleService from '../services/articleService';
import './ArticleDetail.css';

function ArticleDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const viewCounted = useRef(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await articleService.getArticle(id);
        setArticle(res.data || res);

        // 增加浏览量
        if (!viewCounted.current) {
          viewCounted.current = true;
          try {
            await articleService.incrementViewCount(id);
            setArticle(prev => ({ ...prev, view_count: (prev?.view_count || 0) + 1 }));
          } catch (e) {
            viewCounted.current = false;
          }
        }
      } catch (e) {
        console.log('获取文章失败:', e);
        setError(e.message || '获取失败');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      viewCounted.current = false;
      fetch();
    }
  }, [id]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">错误: {error}</div>;
  if (!article) return <div className="not-found">文章不存在</div>;

  return (
    <div className="article-detail">
      <div className="article-container">
        <ArticleContent article={article} />
        <CommentSection articleId={id} />
      </div>
    </div>
  );
}

export default ArticleDetail;
