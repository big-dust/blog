import httpClient from './api';

const searchService = {
  async searchArticles(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    if (!query || query.trim() === '') {
      throw new Error('搜索关键词不能为空');
    }
    const res = await httpClient.get('/search', { q: query.trim(), page, limit });
    return res.data;
  }
};

export default searchService;
