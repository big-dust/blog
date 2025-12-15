import httpClient from './api';

// 标签相关 API 服务
export const tagService = {
  // 获取所有标签
  async getTags() {
    return httpClient.get('/tags');
  },

  // 获取标签云数据
  async getTagCloud() {
    return httpClient.get('/tags/cloud');
  },

  // 获取单个标签
  async getTag(id) {
    return httpClient.get(`/tags/${id}`);
  },

  // 创建标签
  async createTag(tagData) {
    return httpClient.post('/tags', tagData);
  },

  // 更新标签
  async updateTag(id, tagData) {
    return httpClient.put(`/tags/${id}`, tagData);
  },

  // 删除标签
  async deleteTag(id) {
    return httpClient.delete(`/tags/${id}`);
  }
};

export default tagService;