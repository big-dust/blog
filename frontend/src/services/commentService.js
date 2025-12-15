import httpClient from './api';

// 评论相关 API 服务
export const commentService = {
  // 获取文章评论
  async getComments(articleId) {
    return httpClient.get(`/articles/${articleId}/comments`);
  },

  // 添加评论
  async createComment(articleId, commentData) {
    return httpClient.post(`/articles/${articleId}/comments`, commentData);
  },

  // 回复评论
  async replyToComment(commentId, replyData) {
    return httpClient.post(`/comments/${commentId}/reply`, replyData);
  },

  // 删除评论
  async deleteComment(commentId) {
    return httpClient.delete(`/comments/${commentId}`);
  }
};

export default commentService;