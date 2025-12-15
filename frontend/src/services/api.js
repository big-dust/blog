// API 基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// 错误类型定义
export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// 认证令牌管理
class AuthManager {
  static TOKEN_KEY = 'blog_auth_token';

  static getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // 简单的 JWT 过期检查
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}

// HTTP 客户端类
class HTTPClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // 构建完整 URL
  buildURL(endpoint) {
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }

  // 构建请求头
  buildHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    const token = AuthManager.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // 处理响应
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJSON = contentType && contentType.includes('application/json');
    
    let data;
    try {
      data = isJSON ? await response.json() : await response.text();
    } catch (error) {
      throw new APIError('响应解析失败', response.status, null);
    }

    if (!response.ok) {
      const message = isJSON && data.error ? data.error.message : '请求失败';
      throw new APIError(message, response.status, data);
    }

    return data;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = this.buildURL(endpoint);
    const config = {
      ...options,
      headers: this.buildHeaders(options.headers)
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof APIError) {
        // 处理认证错误
        if (error.status === 401) {
          AuthManager.removeToken();
          // 可以在这里触发重新登录
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        throw error;
      }
      
      // 网络错误或其他错误
      throw new APIError('网络连接失败，请检查网络设置', 0, null);
    }
  }

  // GET 请求
  async get(endpoint, params = {}) {
    const fullURL = this.buildURL(endpoint);
    const url = new URL(fullURL);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(endpoint + (url.search || ''), {
      method: 'GET'
    });
  }

  // POST 请求
  async post(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null
    });
  }

  // PUT 请求
  async put(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null
    });
  }

  // DELETE 请求
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // 文件上传
  async upload(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('image', file);
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {} // 让浏览器自动设置 Content-Type
    });
  }
}

// 创建默认客户端实例
const httpClient = new HTTPClient();

// 导出认证管理器和客户端
export { AuthManager, httpClient };
export default httpClient;