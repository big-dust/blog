import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommentSection from './CommentSection';
import commentService from '../services/commentService';

// Mock the comment service
jest.mock('../services/commentService');

describe('CommentSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders comment form and loads comments', async () => {
    // Mock the API response
    commentService.getComments.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          nickname: '测试用户',
          content: '测试评论',
          created_at: new Date().toISOString(),
          replies: []
        }
      ]
    });

    render(<CommentSection articleId="1" />);

    // Wait for loading to complete and form to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('昵称 *')).toBeInTheDocument();
    });

    // Check if form elements are present
    expect(screen.getByPlaceholderText('邮箱 *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('写下你的评论... *')).toBeInTheDocument();
    expect(screen.getByText('发表评论')).toBeInTheDocument();

    // Wait for comments to load
    await waitFor(() => {
      expect(screen.getByText('测试用户')).toBeInTheDocument();
      expect(screen.getByText('测试评论')).toBeInTheDocument();
    });
  });

  test('validates form input before submission', async () => {
    commentService.getComments.mockResolvedValue({
      success: true,
      data: []
    });

    render(<CommentSection articleId="1" />);

    // Wait for loading to complete and form to appear
    await waitFor(() => {
      expect(screen.getByText('发表评论')).toBeInTheDocument();
    });

    // Try to submit empty form
    const submitButton = screen.getByText('发表评论');
    fireEvent.click(submitButton);

    // Should not call the API with empty form
    expect(commentService.createComment).not.toHaveBeenCalled();
  });

  test('shows reply form when reply button is clicked', async () => {
    commentService.getComments.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          nickname: '测试用户',
          content: '测试评论',
          created_at: new Date().toISOString(),
          replies: []
        }
      ]
    });

    render(<CommentSection articleId="1" />);

    await waitFor(() => {
      expect(screen.getByText('测试用户')).toBeInTheDocument();
    });

    // Click reply button
    const replyButton = screen.getByText('回复');
    fireEvent.click(replyButton);

    // Check if reply form appears
    expect(screen.getByText('发表回复')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  test('displays nested replies correctly', async () => {
    commentService.getComments.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          nickname: '用户1',
          content: '主评论',
          created_at: new Date().toISOString(),
          replies: [
            {
              id: 2,
              nickname: '用户2',
              content: '回复评论',
              created_at: new Date().toISOString(),
              parent_id: 1
            }
          ]
        }
      ]
    });

    render(<CommentSection articleId="1" />);

    await waitFor(() => {
      expect(screen.getByText('用户1')).toBeInTheDocument();
      expect(screen.getByText('主评论')).toBeInTheDocument();
      expect(screen.getByText('用户2')).toBeInTheDocument();
      expect(screen.getByText('回复评论')).toBeInTheDocument();
    });
  });
});