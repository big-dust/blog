import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import './ArticleContent.css';

function ArticleContent({ article }) {
  if (!article) return null;

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
        <ReactMarkdown className="markdown-content">
          {article.content || ''}
        </ReactMarkdown>
      </div>
    </article>
  );
}

export default ArticleContent;
