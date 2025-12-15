import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SearchBox from './SearchBox';
import LoginModal from './LoginModal';
import './Header.css';

function Header() {
  const { isAuthenticated, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.log('登出失败');
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo">
            <h1>个人博客</h1>
          </Link>
        </div>
        <div className="header-center">
          <SearchBox />
        </div>
        <div className="header-right">
          <nav className="nav">
            <Link to="/" className="nav-link">首页</Link>
            {isAuthenticated ? (
              <>
                <Link to="/admin" className="nav-link">管理</Link>
                <button onClick={handleLogout} className="nav-link logout-button">
                  登出
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="nav-link login-button">
                登录
              </button>
            )}
          </nav>
        </div>
      </div>
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </header>
  );
}

export default Header;
