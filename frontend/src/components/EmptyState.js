import React from 'react';
import './EmptyState.css';

function EmptyState({ message = '暂无内容', icon = '📝' }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p className="empty-message">{message}</p>
    </div>
  );
}

export default EmptyState;