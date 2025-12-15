import { useState, useEffect } from 'react';
import commentService from '../services/commentService';
import './CommentSection.css';

function CommentSection({ articleId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState({ nickname: '', email: '', content: '' });
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyForm, setReplyForm] = useState({ nickname: '', email: '', content: '' });

  useEffect(() => {
    loadComments();
  }, [articleId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await commentService.getComments(articleId);
      if (res.success) setComments(res.data);
      else setError('加载失败');
    } catch (e) {
      console.log('加载评论失败:', e);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 简单验证
  const validate = (data) => {
    const { nickname, email, content } = data;
    if (!nickname || !email || !content) return '请填写完整';
    if (!nickname.trim() || !email.trim() || !content.trim()) return '内容不能为空';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return '邮箱格式不对';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate(newComment);
    if (err) { alert(err); return; }

    try {
      setSubmitting(true);
      const res = await commentService.createComment(articleId, {
        nickname: newComment.nickname.trim(),
        email: newComment.email.trim(),
        content: newComment.content.trim()
      });
      if (res.success) {
        setNewComment({ nickname: '', email: '', content: '' });
        await loadComments();
      } else {
        alert('提交失败');
      }
    } catch (e) {
      alert('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e, commentId) => {
    e.preventDefault();
    const err = validate(replyForm);
    if (err) { alert(err); return; }

    try {
      setSubmitting(true);
      const res = await commentService.replyToComment(commentId, {
        nickname: replyForm.nickname.trim(),
        email: replyForm.email.trim(),
        content: replyForm.content.trim()
      });
      if (res.success) {
        setReplyForm({ nickname: '', email: '', content: '' });
        setReplyingTo(null);
        await loadComments();
      } else {
        alert('回复失败');
      }
    } catch (e) {
      alert('回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setNewComment(prev => ({ ...prev, [field]: value }));
  };

  const handleReplyChange = (field, value) => {
    setReplyForm(prev => ({ ...prev, [field]: value }));
  };

  // 计算总评论数
  const getTotal = (list) => {
    let count = list.length;
    list.forEach(c => { if (c.replies) count += c.replies.length; });
    return count;
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">错误: {error}</div>;

  return (
    <section className="comment-section">
      <h3>评论 ({getTotal(comments)})</h3>

      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <input
            type="text"
            placeholder="昵称 *"
            value={newComment.nickname}
            onChange={(e) => handleChange('nickname', e.target.value)}
            required
            disabled={submitting}
          />
          <input
            type="email"
            placeholder="邮箱 *"
            value={newComment.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <textarea
          placeholder="写下你的评论... *"
          value={newComment.content}
          onChange={(e) => handleChange('content', e.target.value)}
          rows="4"
          required
          disabled={submitting}
        />
        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? '提交中...' : '发表评论'}
        </button>
      </form>

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">暂无评论</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="comment">
              <div className="comment-header">
                <span className="comment-author">{c.nickname}</span>
                <span className="comment-date">{new Date(c.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <div className="comment-content">{c.content}</div>

              <div className="comment-actions">
                <button
                  className="reply-button"
                  onClick={() => { setReplyingTo(c.id); setReplyForm({ nickname: '', email: '', content: '' }); }}
                  disabled={replyingTo === c.id}
                >
                  回复
                </button>
              </div>

              {replyingTo === c.id && (
                <form className="reply-form" onSubmit={(e) => handleReplySubmit(e, c.id)}>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="昵称 *"
                      value={replyForm.nickname}
                      onChange={(e) => handleReplyChange('nickname', e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <input
                      type="email"
                      placeholder="邮箱 *"
                      value={replyForm.email}
                      onChange={(e) => handleReplyChange('email', e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <textarea
                    placeholder="写下你的回复... *"
                    value={replyForm.content}
                    onChange={(e) => handleReplyChange('content', e.target.value)}
                    rows="3"
                    required
                    disabled={submitting}
                  />
                  <div className="reply-actions">
                    <button type="submit" className="submit-button" disabled={submitting}>
                      {submitting ? '提交中...' : '发表回复'}
                    </button>
                    <button type="button" className="cancel-button" onClick={() => setReplyingTo(null)}>
                      取消
                    </button>
                  </div>
                </form>
              )}

              {c.replies && c.replies.length > 0 && (
                <div className="comment-replies">
                  {c.replies.map(r => (
                    <div key={r.id} className="comment reply">
                      <div className="comment-header">
                        <span className="comment-author">{r.nickname}</span>
                        <span className="comment-date">{new Date(r.created_at).toLocaleString('zh-CN')}</span>
                      </div>
                      <div className="comment-content">{r.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default CommentSection;
