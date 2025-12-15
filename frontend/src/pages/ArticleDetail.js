import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ArticleContent from '../components/ArticleContent';
import CommentSection from '../components/CommentSection';
import { articleService } from '../services/articleService';
import './ArticleDetail.css';

function ArticleDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const viewCountIncremented = useRef(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 获取文章详情
        const response = await articleService.getArticle(id);
        const articleData = response.data || response;
        setArticle(articleData);
        
        // 每次访问都增加浏览次数，但防止 StrictMode 重复调用
        if (!viewCountIncremented.current) {
          viewCountIncremented.current = true;
          
          try {
            await articleService.incrementViewCount(id);
            
            // 更新本地显示的浏览次数
            setArticle(prev => ({
              ...prev,
              view_count: (prev?.view_count || 0) + 1
            }));
          } catch (viewError) {
            console.warn('增加浏览次数失败:', viewError);
            viewCountIncremented.current = false; // 失败时重置，允许重试
          }
        }
        
      } catch (err) {
        console.error('获取文章失败:', err);
        setError(err.message || '获取文章失败');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      // 重置浏览次数增加标记（当文章 ID 改变时）
      viewCountIncremented.current = false;
      fetchArticle();
    }
  }, [id]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">错误: {error}</div>;
  if (!article) return <div className="not-found">文章未找到</div>;

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