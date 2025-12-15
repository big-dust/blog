import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import './ArticleContent.css';

// 简单的markdown渲染
function renderMarkdown(content) {
  if (!content) return '';

  let html = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br>');

  return html;
}

function ArticleContent({ article }) {
  if (!article) return null;

  const renderedContent = useMemo(() => {
    if (!article.content) return '';
    try {
      return renderMarkdown(article.content);
    } catch (e) {
      // 渲染失败就直接显示
      return article.content.replace(/\n/g, '<br>');
    }
  }, [article.content]);

  return (
    <article className="article-content">
      <header className="article-header">
        <h1 className="article-title">{article.title}</h1>
        <div className="article-meta">
          <span className="article-author">作者: {article.author_name || '未知'}</span>
          <span className="article-date">
            发布于 {new Date(article.created_at).toLocaleDateString('zh-CN')}
          </span>
          <span className="article-views">浏览: {article.view_count || 0}</span>
        </div>
        {article.tags && article.tags.length > 0 && (
          <div className="article-tags">
            {article.tags.map((tag, i) => (
              <Link
                key={i}
                to={`/tag/${article.tag_ids ? article.tag_ids[i] : i}`}
                className="tag-link"
                style={{ backgroundColor: '#007bff' }}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="article-body">
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>
    </article>
  );
}

export default ArticleContent;
