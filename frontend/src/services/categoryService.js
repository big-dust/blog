import httpClient from './api';

const categoryService = {
  async getCategories() {
    return httpClient.get('/categories');
  },
  async getCategory(id) {
    return httpClient.get(`/categories/${id}`);
  },
  async createCategory(data) {
    return httpClient.post('/categories', data);
  },
  async updateCategory(id, data) {
    return httpClient.put(`/categories/${id}`, data);
  },
  async deleteCategory(id) {
    return httpClient.delete(`/categories/${id}`);
  }
};

export default categoryService;
