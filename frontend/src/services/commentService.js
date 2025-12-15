import httpClient from './api';

const commentService = {
  async getComments(articleId) {
    return httpClient.get(`/articles/${articleId}/comments`);
  },
  async createComment(articleId, data) {
    return httpClient.post(`/articles/${articleId}/comments`, data);
  },
  async replyToComment(commentId, data) {
    return httpClient.post(`/comments/${commentId}/reply`, data);
  },
  async deleteComment(commentId) {
    return httpClient.delete(`/comments/${commentId}`);
  }
};

export default commentService;
