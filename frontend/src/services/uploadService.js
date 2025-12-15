import httpClient, { AuthManager } from './api';

const uploadService = {
  async uploadImage(file, options = {}) {
    const { onProgress } = options;

    // 检查文件类型
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error('只能上传图片文件');
    }

    // 检查大小 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('文件太大了');
    }

    if (onProgress) {
      return this.uploadWithProgress('/upload/image', file, onProgress);
    }
    return httpClient.upload('/upload/image', file);
  },

  uploadWithProgress(endpoint, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('image', file);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('解析失败'));
          }
        } else {
          reject(new Error('上传失败'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('网络错误')));
      xhr.addEventListener('abort', () => reject(new Error('取消了')));

      xhr.open('POST', httpClient.buildURL(endpoint));
      const token = AuthManager.getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }
};

export default uploadService;
