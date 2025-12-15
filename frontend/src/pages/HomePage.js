import ArticleList from '../components/ArticleList';
import Sidebar from '../components/Sidebar';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <div className="home-container">
        <div className="home-main">
          <ArticleList />
        </div>
        <div className="home-sidebar">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

export default HomePage;
