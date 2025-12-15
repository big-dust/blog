import httpClient, { AuthManager } from './api';

// 认证相关 API 服务
export const authService = {
  // 管理员登录
  async login(credentials) {
    const response = await httpClient.post('/auth/login', credentials);
    
    // 后端返回的token在 data.tokens.accessToken 中
    if (response.data && response.data.tokens && response.data.tokens.accessToken) {
      AuthManager.setToken(response.data.tokens.accessToken);
    }
    
    return response;
  },

  // 登出
  async logout() {
    AuthManager.removeToken();
    // 可以在这里调用服务器端登出 API
    return Promise.resolve();
  },

  // 刷新令牌
  async refreshToken() {
    const response = await httpClient.post('/auth/refresh');
    
    if (response.data && response.data.accessToken) {
      AuthManager.setToken(response.data.accessToken);
    }
    
    return response;
  },

  // 检查认证状态
  isAuthenticated() {
    return AuthManager.isAuthenticated();
  },

  // 获取当前令牌
  getToken() {
    return AuthManager.getToken();
  }
};

export default authService;