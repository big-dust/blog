import { useState, useEffect } from 'react';
import commentService from '../services/commentService';
import './CommentSection.css';

function CommentSection({ articleId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState({
    nickname: '',
    email: '',
    content: ''
  });
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyForm, setReplyForm] = useState({
    nickname: '',
    email: '',
    content: ''
  });

  useEffect(() => {
    loadComments();
  }, [articleId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await commentService.getComments(articleId);
      if (response.success) {
        setComments(response.data);
      } else {
        setError('加载评论失败');
      }
    } catch (err) {
      console.error('加载评论失败:', err);
      setError('加载评论失败');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (formData) => {
    const { nickname, email, content } = formData;
    
    if (!nickname || !email || !content) {
      return '请填写所有必填字段';
    }
    
    if (!nickname.trim() || !email.trim() || !content.trim()) {
      return '昵称、邮箱和评论内容不能为空或只包含空白字符';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return '邮箱格式不正确';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm(newComment);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const response = await commentService.createComment(articleId, {
        nickname: newComment.nickname.trim(),
        email: newComment.email.trim(),
        content: newComment.content.trim()
      });
      
      if (response.success) {
        setNewComment({ nickname: '', email: '', content: '' });
        await loadComments(); // 重新加载评论列表
      } else {
        alert('评论提交失败');
      }
    } catch (err) {
      console.error('提交评论失败:', err);
      alert('评论提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e, commentId) => {
    e.preventDefault();
    
    const validationError = validateForm(replyForm);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const response = await commentService.replyToComment(commentId, {
        nickname: replyForm.nickname.trim(),
        email: replyForm.email.trim(),
        content: replyForm.content.trim()
      });
      
      if (response.success) {
        setReplyForm({ nickname: '', email: '', content: '' });
        setReplyingTo(null);
        await loadComments(); // 重新加载评论列表
      } else {
        alert('回复提交失败');
      }
    } catch (err) {
      console.error('提交回复失败:', err);
      alert('回复提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setNewComment(prev => ({ ...prev, [field]: value }));
  };

  const handleReplyInputChange = (field, value) => {
    setReplyForm(prev => ({ ...prev, [field]: value }));
  };

  const startReply = (commentId) => {
    setReplyingTo(commentId);
    setReplyForm({ nickname: '', email: '', content: '' });
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyForm({ nickname: '', email: '', content: '' });
  };

  const getTotalCommentCount = (comments) => {
    let count = comments.length;
    comments.forEach(comment => {
      if (comment.replies) {
        count += comment.replies.length;
      }
    });
    return count;
  };

  if (loading) return <div className="loading">加载评论中...</div>;
  if (error) return <div className="error">错误: {error}</div>;

  const totalComments = getTotalCommentCount(comments);

  return (
    <section className="comment-section">
      <h3>评论 ({totalComments})</h3>
      
      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <input
            type="text"
            placeholder="昵称 *"
            value={newComment.nickname}
            onChange={(e) => handleInputChange('nickname', e.target.value)}
            required
            disabled={submitting}
          />
          <input
            type="email"
            placeholder="邮箱 *"
            value={newComment.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <textarea
          placeholder="写下你的评论... *"
          value={newComment.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
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
          <div className="no-comments">暂无评论，快来发表第一条评论吧！</div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <span className="comment-author">{comment.nickname}</span>
                <span className="comment-date">
                  {new Date(comment.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="comment-content">{comment.content}</div>
              
              <div className="comment-actions">
                <button 
                  className="reply-button"
                  onClick={() => startReply(comment.id)}
                  disabled={replyingTo === comment.id}
                >
                  回复
                </button>
              </div>

              {replyingTo === comment.id && (
                <form className="reply-form" onSubmit={(e) => handleReplySubmit(e, comment.id)}>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="昵称 *"
                      value={replyForm.nickname}
                      onChange={(e) => handleReplyInputChange('nickname', e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <input
                      type="email"
                      placeholder="邮箱 *"
                      value={replyForm.email}
                      onChange={(e) => handleReplyInputChange('email', e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <textarea
                    placeholder="写下你的回复... *"
                    value={replyForm.content}
                    onChange={(e) => handleReplyInputChange('content', e.target.value)}
                    rows="3"
                    required
                    disabled={submitting}
                  />
                  <div className="reply-actions">
                    <button type="submit" className="submit-button" disabled={submitting}>
                      {submitting ? '提交中...' : '发表回复'}
                    </button>
                    <button type="button" className="cancel-button" onClick={cancelReply}>
                      取消
                    </button>
                  </div>
                </form>
              )}
              
              {comment.replies && comment.replies.length > 0 && (
                <div className="comment-replies">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="comment reply">
                      <div className="comment-header">
                        <span className="comment-author">{reply.nickname}</span>
                        <span className="comment-date">
                          {new Date(reply.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="comment-content">{reply.content}</div>
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