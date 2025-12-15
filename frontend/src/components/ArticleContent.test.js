import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ArticleContent from './ArticleContent';

// 包装组件以提供 Router 上下文
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ArticleContent', () => {
  const mockArticle = {
    id: 1,
    title: '测试文章标题',
    content: '# 标题\n\n这是一个**粗体**文本和*斜体*文本的示例。\n\n- 列表项 1\n- 列表项 2',
    author_name: '测试作者',
    created_at: '2024-01-01T00:00:00Z',
    view_count: 42,
    tags: ['React', 'JavaScript'],
    tag_ids: [1, 2]
  };

  test('渲染文章基本信息', () => {
    renderWithRouter(<ArticleContent article={mockArticle} />);
    
    expect(screen.getByText('测试文章标题')).toBeInTheDocument();
    expect(screen.getByText(/作者: 测试作者/)).toBeInTheDocument();
    expect(screen.getByText(/浏览: 42/)).toBeInTheDocument();
  });

  test('渲染 Markdown 内容', () => {
    renderWithRouter(<ArticleContent article={mockArticle} />);
    
    // 检查 Markdown 是否被正确渲染为 HTML - 查找内容中的标题
    expect(screen.getByText('标题')).toBeInTheDocument();
    // 检查粗体和斜体是否被渲染
    const strongElement = screen.getByText('粗体');
    expect(strongElement.tagName).toBe('STRONG');
  });

  test('渲染标签', () => {
    renderWithRouter(<ArticleContent article={mockArticle} />);
    
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  test('处理空文章', () => {
    renderWithRouter(<ArticleContent article={null} />);
    
    // 组件应该返回 null，不渲染任何内容
    expect(document.body.textContent).toBe('');
  });

  test('处理缺少可选字段的文章', () => {
    const minimalArticle = {
      id: 1,
      title: '最小文章',
      content: '简单内容',
      created_at: '2024-01-01T00:00:00Z'
    };

    renderWithRouter(<ArticleContent article={minimalArticle} />);
    
    expect(screen.getByText('最小文章')).toBeInTheDocument();
    expect(screen.getByText(/作者: 未知作者/)).toBeInTheDocument();
    expect(screen.getByText(/浏览: 0/)).toBeInTheDocument();
  });
});