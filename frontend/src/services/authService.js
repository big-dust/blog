import httpClient, { AuthManager } from './api';

const authService = {
  async login(credentials) {
    const res = await httpClient.post('/auth/login', credentials);
    if (res.data && res.data.tokens && res.data.tokens.accessToken) {
      AuthManager.setToken(res.data.tokens.accessToken);
    }
    return res;
  },

  async logout() {
    AuthManager.removeToken();
    return Promise.resolve();
  },

  async refreshToken() {
    const res = await httpClient.post('/auth/refresh');
    if (res.data && res.data.accessToken) {
      AuthManager.setToken(res.data.accessToken);
    }
    return res;
  },

  isAuthenticated() {
    return AuthManager.isAuthenticated();
  },

  getToken() {
    return AuthManager.getToken();
  }
};

export default authService;
