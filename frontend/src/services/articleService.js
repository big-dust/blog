import httpClient from './api';

// 文章相关 API 服务
export const articleService = {
  // 获取文章列表
  async getArticles(params = {}) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      tagId,
      search
    } = params;

    const queryParams = { page, limit };
    if (categoryId) queryParams.category_id = categoryId;
    if (tagId) queryParams.tag_id = tagId;
    if (search) queryParams.search = search;

    return httpClient.get('/articles', queryParams);
  },

  // 获取单篇文章
  async getArticle(id) {
    return httpClient.get(`/articles/${id}`);
  },

  // 创建文章
  async createArticle(articleData) {
    return httpClient.post('/articles', articleData);
  },

  // 更新文章
  async updateArticle(id, articleData) {
    return httpClient.put(`/articles/${id}`, articleData);
  },

  // 删除文章
  async deleteArticle(id) {
    return httpClient.delete(`/articles/${id}`);
  },

  // 增加浏览次数
  async incrementViewCount(id) {
    return httpClient.post(`/articles/${id}/view`);
  },

  // 搜索文章
  async searchArticles(query, params = {}) {
    const { page = 1, limit = 10 } = params;
    return httpClient.get('/search', { q: query, page, limit });
  }
};

export default articleService;