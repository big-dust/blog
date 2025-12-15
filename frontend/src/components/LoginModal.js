import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginModal.css';

function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(credentials);
      onClose();
      setCredentials({ username: '', password: '' });
    } catch (e) {
      setError(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError('');
      setCredentials({ username: '', password: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={handleClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-header">
          <h2>管理员登录</h2>
          <button className="close-button" onClick={handleClose} disabled={loading}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="请输入用户名"
              disabled={loading}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="请输入密码"
              disabled={loading}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={handleClose} disabled={loading}>取消</button>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;
