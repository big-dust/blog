import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBox.css';

function SearchBox() {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setError('请输入关键词');
      return;
    }
    setError('');
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="search-box-container">
      <form className="search-box" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="搜索文章..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (error) setError(''); }}
          className={`search-input ${error ? 'error' : ''}`}
        />
        <button type="submit" className="search-button">搜索</button>
      </form>
      {error && <div className="search-error">{error}</div>}
    </div>
  );
}

export default SearchBox;
