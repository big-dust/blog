import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders blog title in header', () => {
  render(<App />);
  const titleElement = screen.getByRole('heading', { name: /个人博客/i });
  expect(titleElement).toBeInTheDocument();
});

test('renders navigation links', () => {
  render(<App />);
  const homeLink = screen.getByRole('link', { name: /首页/i });
  const adminLink = screen.getByRole('link', { name: /管理/i });
  expect(homeLink).toBeInTheDocument();
  expect(adminLink).toBeInTheDocument();
});

test('renders search box', () => {
  render(<App />);
  const searchInput = screen.getByPlaceholderText(/搜索文章/i);
  const searchButton = screen.getByRole('button', { name: /搜索/i });
  expect(searchInput).toBeInTheDocument();
  expect(searchButton).toBeInTheDocument();
});