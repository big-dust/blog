import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchBox from './SearchBox';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('SearchBox Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderSearchBox = () => {
    return render(
      <BrowserRouter>
        <SearchBox />
      </BrowserRouter>
    );
  };

  test('renders search input and button', () => {
    renderSearchBox();
    
    expect(screen.getByPlaceholderText('搜索文章...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '搜索' })).toBeInTheDocument();
  });

  test('shows error for empty search query', () => {
    renderSearchBox();
    
    const searchButton = screen.getByRole('button', { name: '搜索' });
    fireEvent.click(searchButton);
    
    expect(screen.getByText('搜索关键词不能为空')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('shows error for whitespace-only search query', () => {
    renderSearchBox();
    
    const searchInput = screen.getByPlaceholderText('搜索文章...');
    const searchButton = screen.getByRole('button', { name: '搜索' });
    
    fireEvent.change(searchInput, { target: { value: '   ' } });
    fireEvent.click(searchButton);
    
    expect(screen.getByText('搜索关键词不能为空')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('navigates to search results for valid query', () => {
    renderSearchBox();
    
    const searchInput = screen.getByPlaceholderText('搜索文章...');
    const searchButton = screen.getByRole('button', { name: '搜索' });
    
    fireEvent.change(searchInput, { target: { value: 'JavaScript' } });
    fireEvent.click(searchButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=JavaScript');
  });

  test('trims whitespace from search query', () => {
    renderSearchBox();
    
    const searchInput = screen.getByPlaceholderText('搜索文章...');
    const searchButton = screen.getByRole('button', { name: '搜索' });
    
    fireEvent.change(searchInput, { target: { value: '  React  ' } });
    fireEvent.click(searchButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=React');
  });

  test('clears error when user starts typing', () => {
    renderSearchBox();
    
    const searchInput = screen.getByPlaceholderText('搜索文章...');
    const searchButton = screen.getByRole('button', { name: '搜索' });
    
    // First trigger an error
    fireEvent.click(searchButton);
    expect(screen.getByText('搜索关键词不能为空')).toBeInTheDocument();
    
    // Then start typing
    fireEvent.change(searchInput, { target: { value: 'J' } });
    expect(screen.queryByText('搜索关键词不能为空')).not.toBeInTheDocument();
  });

  test('submits form on Enter key press', () => {
    renderSearchBox();
    
    const searchInput = screen.getByPlaceholderText('搜索文章...');
    
    fireEvent.change(searchInput, { target: { value: 'Vue.js' } });
    fireEvent.submit(searchInput.closest('form'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=Vue.js');
  });
});