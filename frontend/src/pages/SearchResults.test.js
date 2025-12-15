import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchResults from './SearchResults';
import searchService from '../services/searchService';

// Mock the search service
jest.mock('../services/searchService');

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [mockSearchParams]
}));

describe('SearchResults Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('q');
  });

  const renderSearchResults = () => {
    return render(
      <BrowserRouter>
        <SearchResults />
      </BrowserRouter>
    );
  };

  test('shows empty state when no query provided', () => {
    renderSearchResults();
    expect(screen.getByText('请输入搜索关键词')).toBeInTheDocument();
  });

  test('shows loading state initially when query is provided', () => {
    mockSearchParams.set('q', 'JavaScript');
    renderSearchResults();
    expect(screen.getByText('搜索中...')).toBeInTheDocument();
  });

  test('displays search results when API call succeeds', async () => {
    const mockResults = {
      articles: [
        {
          id: 1,
          title: '<mark>JavaScript</mark> 基础',
          summary: '这是一篇关于 <mark>JavaScript</mark> 的文章...',
          created_at: '2024-01-01T00:00:00Z',
          view_count: 100,
          category_name: '技术'
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    searchService.searchArticles.mockResolvedValue(mockResults);
    mockSearchParams.set('q', 'JavaScript');

    renderSearchResults();

    await waitFor(() => {
      expect(screen.getByText('搜索结果')).toBeInTheDocument();
      expect(screen.getByText('关键词: "JavaScript"')).toBeInTheDocument();
      expect(screen.getByText('找到 1 篇文章')).toBeInTheDocument();
    });

    // Check that the article is displayed with highlighting
    expect(screen.getByText('技术')).toBeInTheDocument();
    expect(screen.getByText('浏览: 100')).toBeInTheDocument();
  });

  test('displays empty state when no results found', async () => {
    const mockResults = {
      articles: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };

    searchService.searchArticles.mockResolvedValue(mockResults);
    mockSearchParams.set('q', 'nonexistent');

    renderSearchResults();

    await waitFor(() => {
      expect(screen.getByText('未找到相关文章，请尝试其他关键词')).toBeInTheDocument();
    });
  });

  test('displays error state when API call fails', async () => {
    searchService.searchArticles.mockRejectedValue(new Error('搜索失败'));
    mockSearchParams.set('q', 'JavaScript');

    renderSearchResults();

    await waitFor(() => {
      expect(screen.getByText('搜索失败')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    });
  });

  test('validates empty search query', async () => {
    searchService.searchArticles.mockRejectedValue(new Error('搜索关键词不能为空'));
    mockSearchParams.set('q', '   ');

    renderSearchResults();

    await waitFor(() => {
      expect(screen.getByText('搜索关键词不能为空')).toBeInTheDocument();
    });
  });

  test('shows pagination when results exceed 10 articles', async () => {
    const mockResults = {
      articles: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Article ${i + 1}`,
        summary: `Summary ${i + 1}`,
        created_at: '2024-01-01T00:00:00Z',
        view_count: 10,
        category_name: '技术'
      })),
      pagination: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      }
    };

    searchService.searchArticles.mockResolvedValue(mockResults);
    mockSearchParams.set('q', 'test');

    renderSearchResults();

    await waitFor(() => {
      expect(screen.getByText('第 1 页，共 3 页 (共 25 篇文章)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '下一页' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
    });
  });
});