import httpClient from './api';

class SearchService {
  /**
   * 搜索文章
   * @param {string} query 搜索关键词
   * @param {Object} options 搜索选项
   * @returns {Promise<Object>} 搜索结果
   */
  async searchArticles(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    
    // 验证搜索关键词不为空 (requirement 4.4)
    if (!query || query.trim() === '') {
      throw new Error('搜索关键词不能为空');
    }
    
    const params = {
      q: query.trim(),
      page,
      limit
    };
    
    const response = await httpClient.get('/search', params);
    return response.data;
  }
}

const searchService = new SearchService();
export default searchService;