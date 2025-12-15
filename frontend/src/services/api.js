const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// 错误类
export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// token管理
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
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}

// http请求
class HTTPClient {
  constructor(baseURL = API_URL) {
    this.baseURL = baseURL;
  }

  buildURL(endpoint) {
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }

  buildHeaders(custom = {}) {
    const headers = { 'Content-Type': 'application/json', ...custom };
    const token = AuthManager.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJSON = contentType && contentType.includes('application/json');

    let data;
    try {
      data = isJSON ? await response.json() : await response.text();
    } catch (e) {
      throw new APIError('解析响应失败', response.status, null);
    }

    if (!response.ok) {
      const msg = isJSON && data.error ? data.error.message || data.error : '请求失败';
      throw new APIError(msg, response.status, data);
    }
    return data;
  }

  async request(endpoint, options = {}) {
    const url = this.buildURL(endpoint);
    const config = { ...options, headers: this.buildHeaders(options.headers) };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (e) {
      if (e instanceof APIError) {
        if (e.status === 401) {
          AuthManager.removeToken();
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        throw e;
      }
      throw new APIError('网络错误', 0, null);
    }
  }

  async get(endpoint, params = {}) {
    const url = new URL(this.buildURL(endpoint));
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) {
        url.searchParams.append(k, params[k]);
      }
    });
    return this.request(endpoint + (url.search || ''), { method: 'GET' });
  }

  async post(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null
    });
  }

  async put(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async upload(endpoint, file, extra = {}) {
    const formData = new FormData();
    formData.append('image', file);
    Object.keys(extra).forEach(k => formData.append(k, extra[k]));

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }
}

const httpClient = new HTTPClient();

export { AuthManager, httpClient };
export default httpClient;
