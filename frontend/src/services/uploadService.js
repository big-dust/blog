import httpClient, { AuthManager } from './api';

// 文件上传相关 API 服务
export const uploadService = {
  // 上传图片
  async uploadImage(file, options = {}) {
    const { onProgress } = options;
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件类型，请上传 JPEG、PNG、GIF 或 WebP 格式的图片');
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过 5MB');
    }

    // 如果需要进度回调，使用 XMLHttpRequest
    if (onProgress) {
      return this.uploadWithProgress('/upload/image', file, onProgress);
    }

    // 否则使用标准上传
    return httpClient.upload('/upload/image', file);
  },

  // 带进度的上传
  uploadWithProgress(endpoint, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('image', file);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('响应解析失败'));
          }
        } else {
          reject(new Error(`上传失败: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('上传被取消'));
      });

      xhr.open('POST', httpClient.buildURL(endpoint));
      
      // 设置认证头 - 必须在 open() 之后
      const token = AuthManager.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }
};

export default uploadService;