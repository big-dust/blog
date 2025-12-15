import httpClient from './api';

// 分类相关 API 服务
export const categoryService = {
  // 获取所有分类
  async getCategories() {
    return httpClient.get('/categories');
  },

  // 获取单个分类
  async getCategory(id) {
    return httpClient.get(`/categories/${id}`);
  },

  // 创建分类
  async createCategory(categoryData) {
    return httpClient.post('/categories', categoryData);
  },

  // 更新分类
  async updateCategory(id, categoryData) {
    return httpClient.put(`/categories/${id}`, categoryData);
  },

  // 删除分类
  async deleteCategory(id) {
    return httpClient.delete(`/categories/${id}`);
  }
};

export default categoryService;