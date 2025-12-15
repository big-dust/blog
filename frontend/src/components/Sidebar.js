import TagCloud from './TagCloud';
import CategoryList from './CategoryList';
import './Sidebar.css';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>分类</h3>
        <CategoryList />
      </div>
      <div className="sidebar-section">
        <h3>标签</h3>
        <TagCloud />
      </div>
    </aside>
  );
}

export default Sidebar;
