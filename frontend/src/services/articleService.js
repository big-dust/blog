import httpClient from './api';

const articleService = {
  // 获取文章列表
  async getArticles(params = {}) {
    const { page = 1, limit = 10, categoryId, tagId, search } = params;
    const query = { page, limit };
    if (categoryId) query.category_id = categoryId;
    if (tagId) query.tag_id = tagId;
    if (search) query.search = search;
    return httpClient.get('/articles', query);
  },

  async getArticle(id) {
    return httpClient.get(`/articles/${id}`);
  },

  async createArticle(data) {
    return httpClient.post('/articles', data);
  },

  async updateArticle(id, data) {
    return httpClient.put(`/articles/${id}`, data);
  },

  async deleteArticle(id) {
    return httpClient.delete(`/articles/${id}`);
  },

  async incrementViewCount(id) {
    return httpClient.post(`/articles/${id}/view`);
  },

  async searchArticles(q, params = {}) {
    const { page = 1, limit = 10 } = params;
    return httpClient.get('/search', { q, page, limit });
  }
};

export default articleService;
