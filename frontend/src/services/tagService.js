import httpClient from './api';

const tagService = {
  async getTags() {
    return httpClient.get('/tags');
  },
  async getTagCloud() {
    return httpClient.get('/tags/cloud');
  },
  async getTag(id) {
    return httpClient.get(`/tags/${id}`);
  },
  async createTag(data) {
    return httpClient.post('/tags', data);
  },
  async updateTag(id, data) {
    return httpClient.put(`/tags/${id}`, data);
  },
  async deleteTag(id) {
    return httpClient.delete(`/tags/${id}`);
  }
};

export default tagService;
