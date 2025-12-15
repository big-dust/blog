import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBox.css';

function SearchBox() {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 验证搜索关键词不为空 (requirement 4.4)
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError('搜索关键词不能为空');
      return;
    }
    
    // 清除错误信息
    setError('');
    
    // 导航到搜索结果页面
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    // 清除错误信息当用户开始输入时
    if (error) {
      setError('');
    }
  };

  return (
    <div className="search-box-container">
      <form className="search-box" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="搜索文章..."
          value={query}
          onChange={handleInputChange}
          className={`search-input ${error ? 'error' : ''}`}
        />
        <button type="submit" className="search-button">
          搜索
        </button>
      </form>
      {error && <div className="search-error">{error}</div>}
    </div>
  );
}

export default SearchBox;